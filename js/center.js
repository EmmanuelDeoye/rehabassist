// js/center.js
// Shared "Center / Organization" logic used by settings.html, admin.html, and
// any tool page (doc.html, presentation.html, rom.html, project.html, etc.)
// that wants to (a) respect a center owner's per-member access toggles and
// (b) log member activity so the center owner can track who did what.
//
// Data model (Firebase Realtime Database):
//   users/{uid}.accountType   = 'individual' | 'center'
//   users/{uid}.centerId      = uid of the center this user OWNS (owners only)
//   users/{uid}.memberOf      = uid of the center this user BELONGS to (members only)
//   users/{centerUid}/centers                       = { name, ownerUid, ownerEmail, createdAt }
//   users/{centerUid}/centers/members/{memberUid}   = { email, name, status: 'active'|'revoked', permissions: {tool: bool}, addedAt }
//   users/{centerUid}/centers/pendingInvites/{key}  = { email, permissions, invitedAt }  (key = sanitized email, for users who don't have an account yet)
//   users/{centerUid}/centers/activity/{pushId}     = { uid, email, name, page, action, detail, timestamp }
// (Nested under the owning user's own record rather than a separate top-level "centers" node.)

(function () {
  const TOOL_KEYS = ['doc', 'presentation', 'rom', 'project', 'standardized', 'exam', 'study', 'assignment', 'ppt', 'audio'];

  function sanitizeEmailKey(email) {
    return (email || '').trim().toLowerCase().replace(/[.#$/\[\]]/g, '_');
  }

  function db() {
    return firebase.database();
  }

  // Resolve the current user's center context. Cached per call (cheap - a couple of reads).
  async function getContext() {
    const user = firebase.auth().currentUser;
    if (!user) return { loggedIn: false };

    const userSnap = await db().ref('users/' + user.uid).once('value');
    const userData = userSnap.val() || {};

    const ctx = {
      loggedIn: true,
      uid: user.uid,
      email: user.email,
      name: userData.name || user.displayName || user.email,
      accountType: userData.accountType || 'individual',
      isCenterOwner: userData.accountType === 'center',
      centerId: userData.accountType === 'center' ? user.uid : (userData.memberOf || null),
      isMember: !!userData.memberOf,
      permissions: null
    };

    if (ctx.isMember && ctx.centerId) {
      const memberSnap = await db().ref(`users/${ctx.centerId}/centers/members/${user.uid}`).once('value');
      const memberData = memberSnap.val() || {};
      ctx.memberStatus = memberData.status || 'active';
      ctx.permissions = memberData.permissions || {};
    }

    return ctx;
  }

  // Convert an existing individual account into a center, from settings.html.
  async function convertToCenter(orgName) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Not logged in.');
    if (!orgName || !orgName.trim()) throw new Error('Organization name is required.');

    await db().ref('users/' + user.uid + '/centers').set({
      name: orgName.trim(),
      ownerUid: user.uid,
      ownerEmail: user.email,
      createdAt: new Date().toISOString()
    });

    await db().ref('users/' + user.uid).update({
      accountType: 'center',
      centerId: user.uid
    });

    return user.uid;
  }

  // Invite a member by email. If they already have a rehablix account, link immediately.
  // Otherwise, store a pending invite that auto-links the next time that email logs in
  // (see linkPendingInviteForUser, called from auth.js on login/registration).
  async function inviteMember(centerUid, email, permissions) {
    if (!email) throw new Error('Email is required.');
    const cleanEmail = email.trim().toLowerCase();
    const perms = permissions || TOOL_KEYS.reduce((acc, k) => (acc[k] = true, acc), {});

    const usersSnap = await db().ref('users').orderByChild('email').equalTo(cleanEmail).once('value');
    const usersVal = usersSnap.val();

    if (usersVal) {
      const memberUid = Object.keys(usersVal)[0];
      const memberData = usersVal[memberUid];

      if (memberUid === centerUid) throw new Error("You can't invite yourself.");

      await db().ref(`users/${centerUid}/centers/members/${memberUid}`).set({
        email: cleanEmail,
        name: memberData.name || cleanEmail,
        status: 'active',
        permissions: perms,
        addedAt: new Date().toISOString()
      });
      await db().ref('users/' + memberUid).update({ memberOf: centerUid });
      return { linked: true, memberUid };
    }

    // No account yet — store a pending invite keyed by sanitized email.
    await db().ref(`users/${centerUid}/centers/pendingInvites/${sanitizeEmailKey(cleanEmail)}`).set({
      email: cleanEmail,
      permissions: perms,
      invitedAt: new Date().toISOString()
    });
    return { linked: false };
  }

  // Called on login/registration (from auth.js) to auto-link a pending invite
  // if this user's email matches one, across ALL centers. Since centers now
  // live nested under each owner's users/{uid}/centers record rather than a
  // dedicated top-level node, this scans the users tree and checks each
  // user's nested .centers.pendingInvites.
  async function linkPendingInviteForUser(uid, email, name) {
    if (!email) return;
    const key = sanitizeEmailKey(email);
    const usersSnap = await db().ref('users').once('value');
    const users = usersSnap.val() || {};

    for (const centerUid of Object.keys(users)) {
      const center = users[centerUid].centers;
      const invite = center && center.pendingInvites && center.pendingInvites[key];
      if (invite) {
        await db().ref(`users/${centerUid}/centers/members/${uid}`).set({
          email: email.toLowerCase(),
          name: name || email,
          status: 'active',
          permissions: invite.permissions || {},
          addedAt: new Date().toISOString()
        });
        await db().ref(`users/${centerUid}/centers/pendingInvites/${key}`).remove();
        await db().ref('users/' + uid).update({ memberOf: centerUid });
      }
    }
  }

  // Toggle a specific tool's access on/off for a member, "at will", by the center owner.
  async function setMemberPermission(centerUid, memberUid, toolKey, enabled) {
    await db().ref(`users/${centerUid}/centers/members/${memberUid}/permissions/${toolKey}`).set(!!enabled);
  }

  // Fully revoke / restore a member's access to the center.
  async function setMemberStatus(centerUid, memberUid, status) {
    await db().ref(`users/${centerUid}/centers/members/${memberUid}/status`).set(status);
  }

  async function removeMember(centerUid, memberUid) {
    await db().ref(`users/${centerUid}/centers/members/${memberUid}`).remove();
    await db().ref('users/' + memberUid + '/memberOf').remove();
  }

  // Check whether the current user is allowed to use a given tool page.
  // Individuals and center owners always have access; members are gated by
  // their center's per-tool permission + active status.
  async function checkAccess(toolKey) {
    const ctx = await getContext();
    if (!ctx.loggedIn) return true; // let the page's own auth-gate logic handle logged-out state
    if (!ctx.isMember) return true; // individuals & center owners
    if (ctx.memberStatus === 'revoked') return false;
    if (ctx.permissions && ctx.permissions[toolKey] === false) return false;
    return true;
  }

  // Log an activity entry against the current user's center (if any), visible
  // to the center owner in settings.html. No-op for individuals / non-members-in-a-center-context.
  async function logActivity(page, action, detail) {
    try {
      const user = firebase.auth().currentUser;
      if (!user) return;
      const userSnap = await db().ref('users/' + user.uid).once('value');
      const userData = userSnap.val() || {};
      const centerUid = userData.accountType === 'center' ? user.uid : userData.memberOf;
      if (!centerUid) return; // not part of any center — nothing to log

      await db().ref(`users/${centerUid}/centers/activity`).push({
        uid: user.uid,
        email: user.email,
        name: userData.name || user.email,
        page: page,
        action: action,
        detail: detail || '',
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('logActivity error:', err);
    }
  }

  // One-time, silent migration of legacy top-level centers/{uid} data (from
  // before centers were nested under users/{uid}/centers) — no user prompt
  // needed since this is just an internal restructuring of the owner's own data.
  async function migrateLegacyCenterNode(uid) {
    try {
      const alreadyNested = await db().ref(`users/${uid}/centers`).once('value');
      if (alreadyNested.exists()) return; // already on the new structure

      const legacySnap = await db().ref('centers/' + uid).once('value');
      const legacyData = legacySnap.val();
      if (!legacyData) return; // nothing to migrate

      await db().ref(`users/${uid}/centers`).set(legacyData);
      await db().ref('centers/' + uid).remove();
      console.log('[center.js] Migrated legacy centers/' + uid + ' to users/' + uid + '/centers');
    } catch (err) {
      console.warn('[center.js] Legacy center migration skipped:', err);
    }
  }

  // Which uid's data should this tool page actually read/write?
  // - Individuals and center OWNERS work on their own uid (which, for an
  //   owner, IS the center's shared data root).
  // - Center MEMBERS work on their center owner's uid instead of their own,
  //   so everyone in the center sees and edits the SAME patients/records —
  //   that's the whole point of a center account. Their own activity still
  //   gets logged under their own name via logActivity().
  // Returns null if the member's access to this specific tool has been
  // revoked or turned off — callers should treat that as "no access" and
  // show an appropriate message rather than silently falling back.
  async function getEffectiveScopeUid(toolKey) {
    const ctx = await getContext();
    if (!ctx.loggedIn) return null;
    if (!ctx.isMember) return ctx.uid; // individual or center owner: own uid is the data root
    if (ctx.memberStatus === 'revoked') return null;
    if (toolKey && ctx.permissions && ctx.permissions[toolKey] === false) return null;
    return ctx.centerId;
  }

  // ---------------------------------------------------------------------
  // Custom center link (e.g. rehablix.com/rehabverve)
  // Slugs need a fast lookup ("is this slug taken? which center is it?")
  // that Realtime Database can't do by scanning nested user records, so we
  // keep one small top-level index: centerSlugs/{slug} -> centerUid.
  // The slug's actual value + its last-changed date still live with the
  // center itself, at users/{centerUid}/centers.slug / .slugUpdatedAt.
  // ---------------------------------------------------------------------
  const SLUG_EDIT_COOLDOWN_DAYS = 15;
  const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/; // 3-30 chars, lowercase/digits/hyphens, no leading/trailing hyphen

  const RESERVED_SLUGS = new Set([
    'index', 'admin', 'settings', 'ask', 'doc', 'docresult', 'documentation', 'audio',
    'rom', 'gait', 'presentation', 'project', 'study', 'exam', 'standardized', 'assignment',
    'answer', 'result', 'sub', 'format', 'formatresult', 'join', 'login', 'register', 'js', 'css', 'img'
  ]);

  function normalizeSlug(raw) {
    return (raw || '').trim().toLowerCase();
  }

  function slugValidationError(slug) {
    if (!slug) return 'Enter a link.';
    if (!SLUG_PATTERN.test(slug)) return 'Use 3-30 lowercase letters, numbers, or hyphens (no spaces, no leading/trailing hyphen).';
    if (RESERVED_SLUGS.has(slug)) return 'That link is reserved. Please choose another.';
    return null;
  }

  // Returns { available: bool, ownedByYou: bool }
  async function checkSlugAvailable(slug, centerUid) {
    const snap = await db().ref('centerSlugs/' + slug).once('value');
    const owner = snap.val();
    if (!owner) return { available: true, ownedByYou: false };
    return { available: owner === centerUid, ownedByYou: owner === centerUid };
  }

  function daysUntilSlugEditable(slugUpdatedAt) {
    if (!slugUpdatedAt) return 0;
    const elapsedMs = Date.now() - new Date(slugUpdatedAt).getTime();
    const remainingDays = SLUG_EDIT_COOLDOWN_DAYS - (elapsedMs / 86400000);
    return Math.max(0, Math.ceil(remainingDays));
  }

  // Sets/changes a center's custom link. Throws a descriptive Error on
  // validation failure, taken slug, or an active cooldown.
  async function setCenterSlug(centerUid, rawSlug) {
    const slug = normalizeSlug(rawSlug);
    const validationError = slugValidationError(slug);
    if (validationError) throw new Error(validationError);

    const centerSnap = await db().ref(`users/${centerUid}/centers`).once('value');
    const center = centerSnap.val();
    if (!center) throw new Error('Center not found.');

    const previousSlug = center.slug || null;
    if (previousSlug === slug) return slug; // no-op, nothing changed

    const remainingDays = daysUntilSlugEditable(center.slugUpdatedAt);
    if (previousSlug && remainingDays > 0) {
      throw new Error(`You can change your center link again in ${remainingDays} day${remainingDays === 1 ? '' : 's'}.`);
    }

    const { available } = await checkSlugAvailable(slug, centerUid);
    if (!available) throw new Error('That link is already taken. Please choose another.');

    const updates = {};
    updates[`centerSlugs/${slug}`] = centerUid;
    if (previousSlug) updates[`centerSlugs/${previousSlug}`] = null; // free up the old one
    updates[`users/${centerUid}/centers/slug`] = slug;
    updates[`users/${centerUid}/centers/slugUpdatedAt`] = new Date().toISOString();

    await db().ref().update(updates);
    return slug;
  }

  // Looks up which center owns a given slug, for join.html.
  async function getCenterBySlug(rawSlug) {
    const slug = normalizeSlug(rawSlug);
    if (!slug) return null;
    const ownerSnap = await db().ref('centerSlugs/' + slug).once('value');
    const centerUid = ownerSnap.val();
    if (!centerUid) return null;
    const centerSnap = await db().ref(`users/${centerUid}/centers`).once('value');
    const center = centerSnap.val();
    if (!center) return null;
    return { centerUid, ...center };
  }

  window.RehablixCenter = {
    TOOL_KEYS,
    getContext,
    getEffectiveScopeUid,
    convertToCenter,
    inviteMember,
    linkPendingInviteForUser,
    migrateLegacyCenterNode,
    setMemberPermission,
    setMemberStatus,
    removeMember,
    checkAccess,
    logActivity,
    slugValidationError,
    checkSlugAvailable,
    daysUntilSlugEditable,
    setCenterSlug,
    getCenterBySlug,
    SLUG_EDIT_COOLDOWN_DAYS
  };
})();

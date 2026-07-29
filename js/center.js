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
//   centers/{centerUid}                       = { name, ownerUid, ownerEmail, createdAt }
//   centers/{centerUid}/members/{memberUid}   = { email, name, status: 'active'|'revoked', permissions: {tool: bool}, addedAt }
//   centers/{centerUid}/pendingInvites/{key}  = { email, permissions, invitedAt }  (key = sanitized email, for users who don't have an account yet)
//   centers/{centerUid}/activity/{pushId}     = { uid, email, name, page, action, detail, timestamp }

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
      const memberSnap = await db().ref(`centers/${ctx.centerId}/members/${user.uid}`).once('value');
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

    await db().ref('centers/' + user.uid).set({
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

      await db().ref(`centers/${centerUid}/members/${memberUid}`).set({
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
    await db().ref(`centers/${centerUid}/pendingInvites/${sanitizeEmailKey(cleanEmail)}`).set({
      email: cleanEmail,
      permissions: perms,
      invitedAt: new Date().toISOString()
    });
    return { linked: false };
  }

  // Called on login/registration (from auth.js) to auto-link a pending invite
  // if this user's email matches one, across ALL centers.
  async function linkPendingInviteForUser(uid, email, name) {
    if (!email) return;
    const key = sanitizeEmailKey(email);
    const centersSnap = await db().ref('centers').once('value');
    const centers = centersSnap.val() || {};

    for (const centerUid of Object.keys(centers)) {
      const invite = centers[centerUid].pendingInvites && centers[centerUid].pendingInvites[key];
      if (invite) {
        await db().ref(`centers/${centerUid}/members/${uid}`).set({
          email: email.toLowerCase(),
          name: name || email,
          status: 'active',
          permissions: invite.permissions || {},
          addedAt: new Date().toISOString()
        });
        await db().ref(`centers/${centerUid}/pendingInvites/${key}`).remove();
        await db().ref('users/' + uid).update({ memberOf: centerUid });
      }
    }
  }

  // Toggle a specific tool's access on/off for a member, "at will", by the center owner.
  async function setMemberPermission(centerUid, memberUid, toolKey, enabled) {
    await db().ref(`centers/${centerUid}/members/${memberUid}/permissions/${toolKey}`).set(!!enabled);
  }

  // Fully revoke / restore a member's access to the center.
  async function setMemberStatus(centerUid, memberUid, status) {
    await db().ref(`centers/${centerUid}/members/${memberUid}/status`).set(status);
  }

  async function removeMember(centerUid, memberUid) {
    await db().ref(`centers/${centerUid}/members/${memberUid}`).remove();
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

      await db().ref(`centers/${centerUid}/activity`).push({
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

  window.RehablixCenter = {
    TOOL_KEYS,
    getContext,
    convertToCenter,
    inviteMember,
    linkPendingInviteForUser,
    setMemberPermission,
    setMemberStatus,
    removeMember,
    checkAccess,
    logActivity
  };
})();

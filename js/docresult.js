// docresult.js - Document editor with Firebase fetch and save
document.addEventListener('DOMContentLoaded', async function() {
    // DOM elements
    const editor = document.getElementById('editorContent');
    const docDateSpan = document.getElementById('docDate');
    const saveBtn = document.getElementById('saveEditBtn');
    const downloadBtn = document.getElementById('downloadDocBtn');
    const printBtn = document.getElementById('printDocBtn');
    const closeBtn = document.getElementById('closeDocBtn');
    const toastContainer = document.getElementById('toast-container');
    
    // Get ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const historyId = urlParams.get('id');
    
    if (!historyId) {
        showToast('No analysis ID provided', 'error');
        editor.innerHTML = '<p class="loading-editor">No analysis found. Please go back and generate an analysis first.</p>';
        return;
    }
    
    // Firebase references
    let currentUser = null;
    let analysisData = null;
    
    // Wait for auth
    firebase.auth().onAuthStateChanged(async (user) => {
        currentUser = user;
        if (!user) {
            showToast('Please login to view this analysis', 'error');
            editor.innerHTML = '<p class="loading-editor">Please login to access this document.</p>';
            return;
        }
        await loadAnalysis(historyId);
    });
    
    async function loadAnalysis(id) {
        try {
            const snapshot = await firebase.database().ref(`users/${currentUser.uid}/analysisHistory/${id}`).once('value');
            const data = snapshot.val();
            if (!data) {
                throw new Error('Analysis not found');
            }
            analysisData = data;
            // Display the content in the editor (as HTML)
            const rawText = data.results;
            // Convert markdown to HTML
            const htmlContent = marked.parse(rawText);
            editor.innerHTML = htmlContent;
            docDateSpan.textContent = `Generated: ${data.date || new Date().toLocaleDateString()}`;
        } catch (err) {
            console.error(err);
            showToast('Failed to load analysis', 'error');
            editor.innerHTML = '<p class="loading-editor">Error loading analysis. Please try again.</p>';
        }
    }
    
    // Formatting commands
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const command = btn.dataset.command;
            if (command === 'createLink') {
                const url = prompt('Enter URL:', 'https://');
                if (url) document.execCommand(command, false, url);
            } else if (command === 'removeFormat') {
                document.execCommand('removeFormat', false, null);
            } else {
                document.execCommand(command, false, null);
            }
            editor.focus();
        });
    });
    
    // Save edited content back to Firebase
    saveBtn.addEventListener('click', async () => {
        if (!analysisData || !currentUser || !historyId) return;
        const newHtml = editor.innerHTML;
        // Convert HTML back to markdown (simple: strip tags, but we want to preserve structure)
        // For simplicity, we'll store the HTML directly. But we might want to convert to markdown for consistency.
        // We'll store both.
        const markdown = htmlToMarkdown(newHtml);
        await firebase.database().ref(`users/${currentUser.uid}/analysisHistory/${historyId}`).update({
            resultsMarkdown: markdown,
            resultsHtml: newHtml,
            lastEdited: firebase.database.ServerValue.TIMESTAMP
        });
        showToast('Changes saved to history', 'success');
    });
    
    // Helper to convert HTML to markdown (basic)
    function htmlToMarkdown(html) {
        // This is a simple placeholder; you could use a library like turndown, but we'll keep it basic
        // For now, just store HTML and also keep original markdown. For export, we'll use HTML.
        // We'll just return a placeholder.
        return html.replace(/<[^>]*>/g, ' ').trim();
    }
    
    // Download as Word (using docx)
    downloadBtn.addEventListener('click', async () => {
        if (!analysisData) return;
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        try {
            // Convert current editor content to plain text for docx (or we could keep HTML)
            const content = editor.innerText;
            const paragraphs = content.split('\n').map(line => new docx.Paragraph({ text: line }));
            const doc = new docx.Document({
                sections: [{
                    children: [
                        new docx.Paragraph({ text: "rehab.ai Analysis Report", heading: docx.HeadingLevel.HEADING_1 }),
                        new docx.Paragraph({ text: `Date: ${docDateSpan.textContent}` }),
                        new docx.Paragraph({ text: "" }),
                        ...paragraphs
                    ]
                }]
            });
            const blob = await docx.Packer.toBlob(doc);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rehab_analysis_${Date.now()}.docx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            showToast('Export failed', 'error');
            console.error(err);
        } finally {
            downloadBtn.innerHTML = originalText;
        }
    });
    
    // Print
    printBtn.addEventListener('click', () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head><title>rehab.ai Analysis</title><style>
                body { font-family: Arial, sans-serif; line-height: 1.6; padding: 2rem; }
                h1 { color: #00695c; border-bottom: 2px solid #00695c; }
                @media print { body { margin: 0; } }
            </style></head>
            <body>${editor.innerHTML}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    });
    
    // Close button: go back to documentation page
    closeBtn.addEventListener('click', () => {
        window.location.href = 'documentation.html';
    });
    
    function showToast(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    }
});
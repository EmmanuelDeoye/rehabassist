// js/result.js
document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const resultId = urlParams.get('id');
  const resultDisplay = document.getElementById('resultDisplay');

  if (!resultId) {
    resultDisplay.innerHTML = '<p class="error-message">No result ID provided.</p>';
    return;
  }

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      resultDisplay.innerHTML = '<p>Please log in to view this result.</p>';
      return;
    }

    const resultRef = firebase.database().ref(`users/${user.uid}/history/${resultId}`);
    try {
      const snapshot = await resultRef.once('value');
      const data = snapshot.val();
      if (!data) {
        resultDisplay.innerHTML = '<p>Result not found.</p>';
        return;
      }

      // Format nicely
      const html = `
        <h2>Generated Result</h2>
        <p><strong>Prompt:</strong> ${data.prompt || ''}</p>
        <p><strong>Instruction:</strong> ${data.instruction || ''}</p>
        ${data.fileNames ? `<p><strong>Files:</strong> ${data.fileNames.join(', ')}</p>` : ''}
        ${data.audioName ? `<p><strong>Audio:</strong> ${data.audioName}</p>` : ''}
        <hr>
        <div style="white-space: pre-wrap;">${data.generatedText || ''}</div>
        <hr>
        <small>Generated on: ${new Date(data.timestamp).toLocaleString()}</small>
      `;
      resultDisplay.innerHTML = html;
    } catch (error) {
      resultDisplay.innerHTML = '<p>Error loading result.</p>';
      console.error(error);
    }
  });
});
import html2canvas from 'html2canvas';

async function parseHTML(toCanvas) {
  if (!toCanvas || toCanvas.parentNode.dataset.to === 'html') {
    return Promise.reject();
  }
  const canvas = await html2canvas(toCanvas);
  return canvas;
}

export default parseHTML;

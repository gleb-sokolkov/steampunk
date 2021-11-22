import html2canvas from 'html2canvas';

async function parseHTML(toCanvas, params) {
  if (!toCanvas || toCanvas.parentNode.dataset.to === 'html') {
    return Promise.reject();
  }
  const canvas = await html2canvas(toCanvas, params);
  return canvas;
}

export default parseHTML;

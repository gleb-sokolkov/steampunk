export default class RoundText {
  constructor(root) {
    this.root = root;
    this.stepSize = +root.dataset.stepSize;
    this.width = root.clientWidth;
    this.height = root.clientHeight;
    this.items = [];
    const text = this.root.innerText;
    this.root.innerText = '';
    text.split('').forEach(this.addChar.bind(this));
  }

  addChar(ch) {
    const char = document.createElement('div');
    char.classList.add('round-text__item');
    char.innerText = ch;
    this.items.push(char);
    this.root.appendChild(char);
    this.updateRound();
  }

  updateRound() {
    const offset = 90 - this.stepSize * (this.items.length - 1) * 0.5 - 90;
    this.items.reduce((accum, item) => {
      item.style.transform = `rotate(${accum}deg) translate(-50%, 0%)`;
      return accum + this.stepSize;
    }, offset);
  }
}

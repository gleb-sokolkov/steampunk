import './polyfills';
import './scss/styles.scss';
import './scss/steampunk/index.scss';

import RoundText from './js/round-text/roundText';
const roundTexts = document.querySelectorAll("[data-text=\"round\"]");
roundTexts.forEach(text => new RoundText(text));
require('./js/noiseBG');

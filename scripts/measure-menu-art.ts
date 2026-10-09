import {readFileSync,writeFileSync} from 'node:fs';
import {measureWorldArt} from './measure-world-art';
const atlas=measureWorldArt(readFileSync('public/assets/menu-rewards.png'),3,3);
writeFileSync('src/menuRewardFrames.json',JSON.stringify(atlas,null,2)+'\n');
console.log(`Measured ${atlas.frames.length} complete reward illustrations.`);

import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import {BetaSpace} from './BetaSpace';
import './beta.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><BetaSpace/></React.StrictMode>);

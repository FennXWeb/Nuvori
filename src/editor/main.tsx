import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import {WorldEditor} from './WorldEditor';
import './studio.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><WorldEditor/></React.StrictMode>);

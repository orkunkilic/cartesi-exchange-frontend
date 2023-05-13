import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'

import { WagmiConfig, createClient, chain } from 'wagmi';
import { ConnectKitProvider, getDefaultClient } from 'connectkit';

const client = createClient(
  getDefaultClient({
    appName: 'Cartesi Order Book',
    chains: [chain.localhost, chain.optimismGoerli],
  })
);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <WagmiConfig client={client}>
      <ConnectKitProvider theme="auto">
        <App />
      </ConnectKitProvider>
    </WagmiConfig>
  </React.StrictMode>
);

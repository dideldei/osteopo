import { render } from 'solid-js/web';
import App from './App';
import './styles.css';
import { logger } from './utils/logger';

logger.log('Index.tsx loaded');

const root = document.getElementById('root');
logger.log('Root element:', root);

if (root) {
  try {
    render(() => <App />, root);
    logger.log('App rendered successfully');
  } catch (error) {
    logger.error('Error rendering App:', error);
  }
} else {
  logger.error('Root element not found');
}


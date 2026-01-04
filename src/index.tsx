import { render } from 'solid-js/web';
import App from './App';
import './styles.css';

console.log('Index.tsx loaded');

const root = document.getElementById('root');
console.log('Root element:', root);

if (root) {
  try {
    render(() => <App />, root);
    console.log('App rendered successfully');
  } catch (error) {
    console.error('Error rendering App:', error);
  }
} else {
  console.error('Root element not found');
}


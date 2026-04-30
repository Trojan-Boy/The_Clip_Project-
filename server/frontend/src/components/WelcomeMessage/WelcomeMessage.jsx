import React from 'react';
import styles from './WelcomeMessage.module.css';

const WelcomeMessage = ({ name }) => {
  return (
    <div className={styles.container}>
      <h1>Hello, {name}!</h1>
      <p>Welcome to your new React application.</p>
    </div>
  );
};

export default WelcomeMessage;

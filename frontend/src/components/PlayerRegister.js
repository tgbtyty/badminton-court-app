import React, { useState } from 'react';
import axios from 'axios';
import config from '../config';

function PlayerRegister() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registrationResult, setRegistrationResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${config.apiBaseUrl}/register-player`, { firstName, lastName });
      setRegistrationResult(response.data);
      setFirstName('');
      setLastName('');
    } catch (error) {
      console.error('Player registration error', error);
      alert('Player registration failed. Please try again.');
    }
  };

  return (
    <div>
      <h2>Player Sign In</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
        <button type="submit">Sign In</button>
      </form>
      {registrationResult && (
        <div>
          <h3>Registration Successful!</h3>
          <p>Username: {registrationResult.username}</p>
          <p>Temporary Password: {registrationResult.tempPassword}</p>
        </div>
      )}
    </div>
  );
}

export default PlayerRegister;

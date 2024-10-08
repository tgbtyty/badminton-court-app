import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';

function Courts() {
  const [courts, setCourts] = useState([]);

  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/courts`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setCourts(response.data);
      } catch (error) {
        console.error('Error fetching courts', error);
      }
    };

    fetchCourts();
  }, []);

  return (
    <div>
      <h2>Badminton Courts</h2>
      {courts.map(court => (
        <div key={court.id}>
          <h3>{court.name}</h3>
          <p>Status: {court.is_locked ? 'Locked' : 'Available'}</p>
        </div>
      ))}
    </div>
  );
}

export default Courts;


import React, { useEffect, useState } from 'react';
import '../styles/PulseCircle.css';
import axios from 'axios';

const PulseCircle = ({ candidaturaId, color = '#2c3e50' }) => {
    const [progreso, setProgreso] = useState(0);

    useEffect(() => {
        // LLamada a la API real
        // axios.get(`https://educonect.alwaysdata.net/api/calendario/progreso/${candidaturaId}`)
        //   .then(response => {
        //      setProgreso(response.data.porcentaje);
        //   });

        // Mock para demostración
        setProgreso(45);
    }, [candidaturaId]);

    return (
        <div className="single-chart">
            <svg viewBox="0 0 36 36" className="circular-chart" style={{ stroke: color }}>
                <path className="circle-bg"
                    d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path className="circle"
                    strokeDasharray={`${progreso}, 100`}
                    d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" className="percentage">{progreso}%</text>
            </svg>
        </div>
    );
};

export default PulseCircle;

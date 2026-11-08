import React from 'react';
import ServiceConsole from '../../ui/ServiceConsole';
import { hrConsole } from '../../config/consoles';
import '../../styles/hr.css';

export default function HrConsole() {
  return <ServiceConsole config={hrConsole} />;
}

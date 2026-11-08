import React, { useEffect, useRef } from 'react';

/**
 * Responsive table pattern: wrap an ordinary <table> and it stays a table from 900 px up, and becomes a
 * stack of list cards on phones (CSS: `.rt`). Each cell needs its column name for the card layout,
 * so after every render the header texts are copied onto the cells as data-label.
 * The first column is the card title. Give a <th> data-label="" to hide a label (e.g. an actions column).
 */
const CardTable = ({ children, className = '', ...rest }) => {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll('table').forEach((table) => {
      const heads = [...table.querySelectorAll('thead th')].map((th) => (th.dataset.label !== undefined ? th.dataset.label : th.textContent.trim()));
      table.querySelectorAll('tbody tr').forEach((tr) => {
        [...tr.children].forEach((td, i) => {
          if (td.hasAttribute('colspan')) return;
          const label = heads[i] || '';
          if (td.getAttribute('data-label') !== label) td.setAttribute('data-label', label);
        });
      });
    });
  });
  return <div ref={ref} className={`rt table-wrap ${className}`} {...rest}>{children}</div>;
};

export default CardTable;

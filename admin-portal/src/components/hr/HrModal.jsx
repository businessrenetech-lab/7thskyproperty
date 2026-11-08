import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import '../../styles/hr.css';

/*
 * HrModal: the dialog the HR screens (ported from Hadi Real Estate) use. Same props as Hadi's Modal:
 * isOpen, onClose, title, subtitle, maxWidth, footer. Light surface to match the console shell; Escape
 * and a click on the backdrop close it.
 */
const HrModal = ({ isOpen = true, onClose, title, subtitle, maxWidth = '600px', children, footer }) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div className="hr-modal__backdrop" onClick={onClose} role="presentation">
      <div className="hr-modal" style={{ maxWidth }} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="hr-modal__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="hr-modal__close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="hr-modal__body">{children}</div>
        {footer && <div className="hr-modal__foot">{footer}</div>}
      </div>
    </div>
  );
};

export default HrModal;

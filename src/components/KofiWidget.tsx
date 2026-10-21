import React, { useEffect } from 'react';

interface KofiWidgetProps {
  text?: string;
  color?: string;
  id?: string;
  className?: string;
  fullWidth?: boolean;
  buttonClassName?: string;
}

export const KofiWidget: React.FC<KofiWidgetProps> = ({
  text = 'Unterstütze meine Arbeit',
  color = '#ffaa00',
  id = 'H0G826CZMP',
  className = '',
  fullWidth = false,
  buttonClassName = '',
}) => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const setupKofi = () => {
      try {
        if ((window as any).kofiwidget2 && typeof (window as any).kofiwidget2.init === 'function') {
          (window as any).kofiwidget2.init(text, color, id);
        }
      } catch (err) {
        console.warn('Ko-Fi widget init notice:', err);
      }
    };

    if ((window as any).kofiwidget2) {
      setupKofi();
    } else {
      const existingScript = document.querySelector('script[src*="Widget_2.js"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://storage.ko-fi.com/cdn/widget/Widget_2.js';
        script.async = true;
        script.onload = setupKofi;
        document.body.appendChild(script);
      } else {
        existingScript.addEventListener('load', setupKofi);
      }
    }
  }, [text, color, id]);

  return (
    <div className={`${fullWidth ? 'flex w-full' : 'inline-flex'} items-center justify-center ${className}`}>
      <style>{`
        @keyframes kofi-wiggle {
          0% { transform: rotate(0) scale(1); }
          60% { transform: rotate(0) scale(1); }
          75% { transform: rotate(0) scale(1.12); }
          80% { transform: rotate(0) scale(1.1); }
          84% { transform: rotate(-10deg) scale(1.1); }
          88% { transform: rotate(10deg) scale(1.1); }
          92% { transform: rotate(-10deg) scale(1.1); }
          96% { transform: rotate(10deg) scale(1.1); }
          100% { transform: rotate(0) scale(1); }
        }
        .kofi-animated-cup {
          animation: kofi-wiggle 3s infinite;
        }
      `}</style>

      <a
        href={`https://ko-fi.com/${id}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ backgroundColor: color }}
        className={`kofi-button group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:brightness-105 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer select-none ${fullWidth ? 'w-full justify-center' : ''} ${buttonClassName}`}
        title="Support me on ko-fi.com"
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/20 p-0.5">
          <img
            src="https://storage.ko-fi.com/cdn/cup-border.png"
            alt="Ko-fi"
            className="kofi-animated-cup h-3.5 w-auto object-contain"
            onError={(e) => {
              // Fallback if CDN blocked
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </span>
        <span className="font-semibold text-slate-950 tracking-tight">
          {text}
        </span>
      </a>
    </div>
  );
};

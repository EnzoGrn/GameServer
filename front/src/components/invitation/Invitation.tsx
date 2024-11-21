'use client';

import { useState } from 'react';

const InvitationBox = ({ invitationCode } : { invitationCode: string }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(invitationCode).then(() => {
        setCopied(true);
  
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      });
    } else {
      const textArea = document.createElement("textarea");

      textArea.value = invitationCode;
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand("copy");

        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Erreur lors de la copie :", err);
      }

      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center bg-white text-gray-800 py-6 px-4 rounded-md shadow-lg my-8">
      <p className="text-lg font-semibold mb-4">Invite your friends to join the game!</p>
      <div className="flex items-center gap-4">
        <input
          type="text" value={invitationCode} readOnly
          className="bg-[#f37b78] text-white px-4 py-2 rounded-md w-full max-w-xs text-center font-mono"
        />
        <button onClick={handleCopy} className="bg-[#f37b78] hover:bg-[#c44b4a] text-white px-4 py-2 rounded-md transition-all">
          Copy
        </button>
      </div>
    </div>
  );
}

export default InvitationBox;

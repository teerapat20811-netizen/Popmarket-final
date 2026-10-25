import { useState, useEffect } from 'react';
import api from '../services/api';

function ChatBox({ receiverId, receiverName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [receiverId]);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/messages/${receiverId}`);
      setMessages(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const sendMessage = async (imageUrl = null) => {
    if (!text.trim() && !imageUrl) return;

    try {
      await api.post('/messages', {
        receiver_id: receiverId,
        message: text,
        image_url: imageUrl,
      });
      setText('');
      fetchMessages();
    } catch (err) {
      alert('ส่งข้อความไม่สำเร็จ');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.url) {
        await sendMessage(res.data.url);
      }
    } catch (err) {
      alert('อัปโหลดรูปภาพไม่สำเร็จ');
    }
    setUploading(false);
  };

  return (
    <div style={chatStyles.overlay}>
      <div style={chatStyles.container}>
        <div style={chatStyles.header}>
          <span>💬 แชทกับ: <strong>{receiverName}</strong></span>
          <button style={chatStyles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={chatStyles.messageList}>
          {messages.map((m, idx) => {
            const isMe = m.sender_id !== receiverId;
            return (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: isMe ? 'flex-end' : 'flex-start',
                marginBottom: '10px'
              }}>
                <div style={{
                  maxWidth: '70%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: isMe ? '#1a7a4a' : '#f1f3f5',
                  color: isMe ? '#fff' : '#212529',
                  fontSize: '13px'
                }}>
                  {m.image_url && (
                    <img 
                      src={m.image_url} 
                      alt="chat-img" 
                      style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: m.message ? '8px' : '0' }} 
                    />
                  )}
                  {m.message && <span>{m.message}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={chatStyles.inputArea}>
          <label style={chatStyles.uploadIcon} title="แนบรูปภาพ">
            📷
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </label>
          
          <input 
            type="text" 
            style={chatStyles.input} 
            placeholder={uploading ? "กำลังอัปโหลดรูป..." : "พิมพ์ข้อความ..."}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            disabled={uploading}
          />
          
          <button style={chatStyles.sendBtn} onClick={() => sendMessage()} disabled={uploading}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

const chatStyles = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  container: { width: '400px', height: '500px', backgroundColor: '#fff', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' },
  header: { padding: '14px 18px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#888' },
  messageList: { flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: '#fdfdfd' },
  inputArea: { padding: '12px', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff' },
  uploadIcon: { fontSize: '20px', cursor: 'pointer', padding: '4px' },
  input: { flex: 1, padding: '10px 14px', border: '1px solid #ced4da', borderRadius: '20px', outline: 'none', fontSize: '13px' },
  sendBtn: { backgroundColor: '#1a7a4a', color: '#fff', border: 'none', width: '38px', height: '38px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }
};

export default ChatBox;
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

function CustomerMessages() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [conversations, setConversations] = useState([]);
  const [chatPartner, setChatPartner] = useState({ id: null, name: '' });
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      alert('กรุณาเข้าสู่ระบบก่อนใช้งานแชท');
      navigate('/login');
      return;
    }
    fetchConversations();
  }, []);

  // ดึงรายชื่อร้านค้าที่ลูกค้าเคยทักไป
  const fetchConversations = async () => {
    try {
      const res = await api.get('/messages/conversations/list');
      setConversations(res.data);
      if (res.data.length > 0 && !chatPartner.id) {
        setChatPartner({
          id: res.data[0].user_id,
          name: res.data[0].shop_name || res.data[0].name
        });
      }
    } catch (err) {
      console.log(err);
    }
  };

  // ดึงข้อความแชทเมื่อเปลี่ยนคู่สนทนา
  useEffect(() => {
    if (!chatPartner.id) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [chatPartner.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    if (!chatPartner.id) return;
    try {
      const res = await api.get(`/messages/${chatPartner.id}`);
      setMessages(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const sendMessage = async (imageUrl = null) => {
    if (!text.trim() && !imageUrl) return;
    try {
      await api.post('/messages', {
        receiver_id: chatPartner.id,
        message: text,
        image_url: imageUrl,
      });
      setText('');
      fetchMessages();
      fetchConversations();
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
      if (res.data.url) await sendMessage(res.data.url);
    } catch (err) {
      alert('อัปโหลดรูปภาพไม่สำเร็จ');
    }
    setUploading(false);
  };

  return (
    <div style={{ fontFamily: "'Sarabun', sans-serif", backgroundColor: '#f8f9fa', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navbar อย่างง่ายสำหรับหน้าแชท */}
      <div style={{ backgroundColor: '#1a7a4a', color: '#fff', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>💬 กล่องข้อความของฉัน</h2>
        <Link to="/" style={{ color: '#fff', textDecoration: 'none', backgroundColor: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px' }}>
          ← กลับหน้าแรก
        </Link>
      </div>

      {/* ส่วนแสดงกล่องแชทหลัก */}
      <div style={{ maxWidth: '1100px', width: '100%', margin: '24px auto', padding: '0 24px', flex: 1, display: 'flex', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', width: '100%', height: '75vh', backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          
          {/* รายชื่อร้านค้าฝั่งซ้าย */}
          <div style={{ width: '320px', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', fontWeight: '800', fontSize: '15px', color: '#222' }}>
              🏪 ร้านค้าที่เคยติดต่อ ({conversations.length})
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {conversations.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#aaa', padding: '32px', fontSize: '13px' }}>ยังไม่มีประวัติการแชทกับร้านค้า</p>
              ) : (
                conversations.map(c => (
                  <div 
                    key={c.user_id} 
                    onClick={() => setChatPartner({ id: c.user_id, name: c.shop_name || c.name })}
                    style={{ 
                      padding: '14px 18px', cursor: 'pointer', borderBottom: '1px solid #f8f9fa', 
                      backgroundColor: chatPartner.id === c.user_id ? '#e8f5e9' : 'transparent', 
                      transition: 'background 0.2s' 
                    }}
                  >
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#222' }}>{c.shop_name || c.name}</div>
                    <div style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '4px' }}>
                      {c.last_message || 'ส่งรูปภาพ'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* พื้นที่แชทกับร้านค้าฝั่งขวา */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fcfcfc', position: 'relative' }}>
            {chatPartner.id ? (
              <>
                <div style={{ padding: '14px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee', fontWeight: '700', fontSize: '14px', color: '#222' }}>
                  กำลังสนทนากับร้าน: <span style={{ color: '#1a7a4a' }}>{chatPartner.name}</span>
                </div>

                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: '#fafbfc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {messages.map((m, idx) => {
                    const isMe = m.sender_id === user.id;
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '65%', padding: '10px 14px', borderRadius: '12px',
                          backgroundColor: isMe ? '#1a7a4a' : '#fff',
                          color: isMe ? '#fff' : '#212529',
                          fontSize: '13px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          border: isMe ? 'none' : '1px solid #eee'
                        }}>
                          {m.image_url && (
                            <img src={m.image_url} alt="chat-img" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '8px', marginBottom: m.message ? '8px' : '0' }} />
                          )}
                          {m.message && <span>{m.message}</span>}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div style={{ padding: '14px 20px', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#fff' }}>
                  <label style={{ fontSize: '20px', cursor: 'pointer', padding: '4px' }} title="แนบรูปภาพ">
                    📷
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                  </label>
                  
                  <input 
                    type="text" 
                    style={{ flex: 1, padding: '10px 16px', border: '1px solid #ced4da', borderRadius: '20px', outline: 'none', fontSize: '13px', backgroundColor: '#f8f9fa' }} 
                    placeholder={uploading ? "กำลังอัปโหลดรูป..." : "พิมพ์ข้อความถึงร้านค้า..."}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    disabled={uploading}
                  />
                  
                  <button 
                    style={{ backgroundColor: '#1a7a4a', color: '#fff', border: 'none', width: '38px', height: '38px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', boxShadow: '0 2px 5px rgba(26,122,74,0.3)' }} 
                    onClick={() => sendMessage()} 
                    disabled={uploading}
                  >
                    ➤
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>
                <span style={{ fontSize: '36px', marginBottom: '8px' }}>💬</span>
                <p style={{ fontSize: '14px', margin: 0 }}>เลือกรายชื่อร้านค้าทางด้านซ้ายเพื่อพูดคุย</p>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}

export default CustomerMessages;
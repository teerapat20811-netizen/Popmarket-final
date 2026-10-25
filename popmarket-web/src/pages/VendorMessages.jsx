import { useState, useEffect } from 'react';
import api from '../services/api';
import ChatBox from '../components/ChatBox';

function VendorMessages() {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // เก็บข้อมูลลูกค้าที่กำลังคุยด้วย

  useEffect(() => {
    fetchConversations();
  }, []);

  // ดึงรายชื่อคนที่เคยทักแชทมาหากร้านค้า
  const fetchConversations = async () => {
    try {
      const res = await api.get('/messages/conversations/list'); // หรือ API ที่ใช้ดึงรายชื่อคู่สนทนาฝั่งร้าน
      setConversations(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div style={{ display: 'flex', height: '80vh', padding: '24px', gap: '20px' }}>
      {/* รายชื่อลูกค้าที่ทักมา */}
      <div style={{ width: '300px', backgroundColor: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3>💬 ข้อความของลูกค้า</h3>
        {conversations.map(c => (
          <div 
            key={c.user_id} 
            onClick={() => setActiveChat(c)}
            style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid #eee', borderRadius: '8px', backgroundColor: activeChat?.user_id === c.user_id ? '#e8f5e9' : 'transparent' }}
          >
            <strong>{c.name}</strong>
            <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>{c.last_message}</p>
          </div>
        ))}
      </div>

      {/* หน้าต่างแชทพูดคุย */}
      <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '12px', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {activeChat ? (
          <ChatBox 
            receiverId={activeChat.user_id} 
            receiverName={activeChat.name} 
            onClose={() => setActiveChat(null)} 
          />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#aaa' }}>
            <p>เลือกชื่อลูกค้าทางซ้ายเพื่อเริ่มสนทนาและส่งรูปภาพ</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VendorMessages;
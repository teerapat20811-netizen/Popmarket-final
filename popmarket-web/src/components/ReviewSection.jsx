import { useState, useEffect } from 'react';
import api from '../services/api';

function ReviewSection({ vendorProfileId }) {
  const [data, setData] = useState({ reviews: [], avg_rating: 0, total: 0 });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchReviews();
  }, [vendorProfileId]);

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/reviews/vendor/${vendorProfileId}`);
      setData(res.data);
    } catch (err) { console.log(err); }
  };

  const submitReview = async () => {
    if (!localStorage.getItem('token')) {
      setError('กรุณาเข้าสู่ระบบก่อนรีวิว');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/reviews', {
        vendor_profile_id: vendorProfileId,
        rating: form.rating,
        comment: form.comment,
      });
      setShowForm(false);
      setForm({ rating: 5, comment: '' });
      fetchReviews();
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาด');
    }
    setLoading(false);
  };

  const deleteReview = async (id) => {
    if (!window.confirm('ต้องการลบรีวิวนี้ไหม?')) return;
    try {
      await api.delete(`/reviews/${id}`);
      fetchReviews();
    } catch (err) { console.log(err); }
  };

  const renderStars = (rating, interactive = false, onRate = null) => {
    return (
      <div style={styles.stars}>
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            style={{
              ...styles.star,
              color: star <= rating ? '#f39c12' : '#ddd',
              cursor: interactive ? 'pointer' : 'default',
              fontSize: interactive ? '28px' : '16px',
            }}
            onClick={() => interactive && onRate && onRate(star)}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'วันนี้';
    if (days === 1) return 'เมื่อวาน';
    if (days < 30) return `${days} วันที่แล้ว`;
    if (days < 365) return `${Math.floor(days/30)} เดือนที่แล้ว`;
    return `${Math.floor(days/365)} ปีที่แล้ว`;
  };

  return (
    <div style={styles.wrap}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>รีวิวจากลูกค้า</h3>
        {localStorage.getItem('token') && (
          <button style={styles.writeBtn}
            onClick={() => setShowForm(!showForm)}>
            {showForm ? 'ยกเลิก' : '✏️ เขียนรีวิว'}
          </button>
        )}
      </div>

      {/* Summary */}
      <div style={styles.summary}>
        <div style={styles.summaryLeft}>
          <div style={styles.bigRating}>{data.avg_rating}</div>
          {renderStars(Math.round(data.avg_rating))}
          <div style={styles.totalReviews}>{data.total} รีวิว</div>
        </div>
        <div style={styles.summaryRight}>
          {[5, 4, 3, 2, 1].map(star => {
            const count = data.reviews.filter(r => r.rating === star).length;
            const pct = data.total > 0 ? (count / data.total) * 100 : 0;
            return (
              <div key={star} style={styles.ratingRow}>
                <span style={styles.ratingLabel}>{star} ★</span>
                <div style={styles.ratingBar}>
                  <div style={{
                    ...styles.ratingFill,
                    width: `${pct}%`,
                  }} />
                </div>
                <span style={styles.ratingCount}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Write Review Form */}
      {showForm && (
        <div style={styles.form}>
          <h4 style={styles.formTitle}>เขียนรีวิว</h4>

          {error && <div style={styles.errorBox}>⚠️ {error}</div>}

          <div style={styles.formSection}>
            <label style={styles.label}>คะแนน</label>
            {renderStars(form.rating, true, (star) =>
              setForm({...form, rating: star})
            )}
            <span style={styles.ratingText}>
              {['', 'แย่มาก', 'แย่', 'พอใช้', 'ดี', 'ดีมาก'][form.rating]}
            </span>
          </div>

          <div style={styles.formSection}>
            <label style={styles.label}>ความคิดเห็น</label>
            <textarea
              style={styles.textarea}
              placeholder="เล่าประสบการณ์ของคุณ..."
              value={form.comment}
              onChange={e => setForm({...form, comment: e.target.value})}
              rows={4}
            />
          </div>

          <button
            style={{...styles.submitBtn, opacity: loading ? 0.7 : 1}}
            onClick={submitReview}
            disabled={loading}
          >
            {loading ? '⏳ กำลังส่ง...' : '📤 ส่งรีวิว'}
          </button>
        </div>
      )}

      {/* Reviews List */}
      {data.reviews.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyIcon}>💬</p>
          <p style={styles.emptyText}>ยังไม่มีรีวิว เป็นคนแรกที่รีวิว!</p>
        </div>
      ) : (
        <div style={styles.list}>
          {data.reviews.map(r => (
            <div key={r.id} style={styles.reviewItem}>
              <div style={styles.reviewLeft}>
                <div style={styles.reviewAvatar}>
                  {r.reviewer_name?.charAt(0).toUpperCase()}
                </div>
              </div>
              <div style={styles.reviewRight}>
                <div style={styles.reviewTop}>
                  <div>
                    <span style={styles.reviewerName}>{r.reviewer_name}</span>
                    <span style={styles.reviewDate}>
                      {timeAgo(r.created_at)}
                    </span>
                  </div>
                  {renderStars(r.rating)}
                </div>
                {r.comment && (
                  <p style={styles.reviewComment}>{r.comment}</p>
                )}
                {user.id === r.reviewer_id && (
                  <button style={styles.deleteBtn}
                    onClick={() => deleteReview(r.id)}>
                    ลบรีวิว
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    fontFamily: "'Sarabun', sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: { fontSize: '18px', fontWeight: '800', margin: 0, color: '#222' },
  writeBtn: {
    padding: '8px 16px',
    backgroundColor: '#1a7a4a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },

  // Summary
  summary: {
    display: 'flex',
    gap: '32px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '10px',
    marginBottom: '20px',
  },
  summaryLeft: { textAlign: 'center', minWidth: '100px' },
  bigRating: {
    fontSize: '48px',
    fontWeight: '800',
    color: '#222',
    lineHeight: 1,
    marginBottom: '6px',
  },
  stars: { display: 'flex', gap: '2px' },
  star: { transition: 'transform 0.1s' },
  totalReviews: { fontSize: '12px', color: '#888', marginTop: '6px' },
  summaryRight: { flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' },
  ratingRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  ratingLabel: { fontSize: '12px', color: '#888', width: '28px', textAlign: 'right' },
  ratingBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#e8e8e8',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  ratingFill: {
    height: '8px',
    backgroundColor: '#f39c12',
    borderRadius: '4px',
    transition: 'width 0.5s',
  },
  ratingCount: { fontSize: '12px', color: '#888', width: '20px' },

  // Form
  form: {
    backgroundColor: '#f8f9fa',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid #eee',
  },
  formTitle: { fontSize: '15px', fontWeight: '800', margin: '0 0 16px', color: '#222' },
  errorBox: {
    backgroundColor: '#fff0f0',
    color: '#e74c3c',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '12px',
    border: '1px solid #ffd0d0',
  },
  formSection: { marginBottom: '14px' },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#555',
    marginBottom: '6px',
  },
  ratingText: {
    fontSize: '13px',
    color: '#f39c12',
    fontWeight: '700',
    marginLeft: '4px',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #e8e8e8',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: "'Sarabun', sans-serif",
    lineHeight: 1.6,
  },
  submitBtn: {
    padding: '10px 24px',
    backgroundColor: '#1a7a4a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '700',
  },

  // Empty
  empty: { textAlign: 'center', padding: '40px' },
  emptyIcon: { fontSize: '36px', margin: '0 0 8px' },
  emptyText: { fontSize: '14px', color: '#aaa', margin: 0 },

  // Reviews
  list: { display: 'flex', flexDirection: 'column', gap: '0' },
  reviewItem: {
    display: 'flex',
    gap: '14px',
    padding: '16px 0',
    borderBottom: '1px solid #f5f5f5',
  },
  reviewLeft: { flexShrink: 0 },
  reviewAvatar: {
    width: '40px', height: '40px',
    borderRadius: '50%',
    backgroundColor: '#1a7a4a',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '16px',
  },
  reviewRight: { flex: 1 },
  reviewTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '6px',
  },
  reviewerName: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#222',
    marginRight: '8px',
  },
  reviewDate: { fontSize: '11px', color: '#aaa' },
  reviewComment: {
    fontSize: '13px',
    color: '#555',
    lineHeight: 1.6,
    margin: '6px 0 0',
  },
  deleteBtn: {
    marginTop: '8px',
    padding: '4px 10px',
    backgroundColor: '#fff0f0',
    color: '#e74c3c',
    border: '1px solid #ffd0d0',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
  },
};

export default ReviewSection;
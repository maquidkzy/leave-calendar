'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, isBefore } from 'date-fns';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import Autocomplete from '@/components/Autocomplete';

type LeaveType = 'PERSONAL' | 'ANNUAL' | 'SICK';

interface Leave {
  id: string;
  name: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
}

const START_DATE = new Date(2026, 5, 1); // June 2026

export default function LeaveCalendarApp() {
  const [currentDate, setCurrentDate] = useState(START_DATE);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  
  // Filters
  const [filters, setFilters] = useState({
    SICK: true,
    PERSONAL: true,
    ANNUAL: true,
  });

  // Offcanvas
  const [offcanvasOpen, setOffcanvasOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'SICK' as LeaveType,
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await fetch('/api/leaves');
      if (res.ok) {
        const data = await res.json();
        setLeaves(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handlePrevMonth = () => {
    const prev = subMonths(currentDate, 1);
    if (!isBefore(prev, START_DATE)) {
      setCurrentDate(prev);
    }
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const toggleFilter = (type: LeaveType) => {
    setFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const openOffcanvas = (date?: Date, existingLeave?: Leave) => {
    if (existingLeave) {
      setEditId(existingLeave.id);
      setFormData({ name: existingLeave.name, type: existingLeave.type });
      setDateRange({
        from: new Date(existingLeave.startDate),
        to: new Date(existingLeave.endDate)
      });
    } else {
      setEditId(null);
      setFormData({ name: '', type: 'SICK' });
      setDateRange(date ? { from: date, to: undefined } : undefined);
    }
    setOffcanvasOpen(true);
  };

  const closeOffcanvas = () => {
    setOffcanvasOpen(false);
    setTimeout(() => {
      setEditId(null);
      setDateRange(undefined);
    }, 300); // Wait for animation
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const toDate = dateRange?.to || dateRange?.from;
    
    if (!formData.name || !dateRange?.from || !toDate) {
      alert('Please fill out all fields and select a date range.');
      return;
    }

    const payload = {
      ...formData,
      startDate: format(dateRange.from, 'yyyy-MM-dd'),
      endDate: format(toDate, 'yyyy-MM-dd')
    };

    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `/api/leaves/${editId}` : '/api/leaves';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchLeaves();
        closeOffcanvas();
      } else {
        const errText = await res.text();
        console.error('Save failed:', errText);
        alert(`Failed to save: ${errText}`);
      }
    } catch (error) {
      console.error(error);
      alert(`Error: ${error}`);
    }
  };

  const handleDelete = async () => {
    if (!editId) return;
    if (!confirm('Are you sure you want to delete this leave?')) return;
    try {
      const res = await fetch(`/api/leaves/${editId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLeaves();
        closeOffcanvas();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Calendar logic
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });
  const startDayOfWeek = startOfMonth(currentDate).getDay();
  const paddingDays = Array.from({ length: startDayOfWeek }).map((_, i) => i);

  const isDateInLeave = (date: Date, leave: Leave) => {
    const d = new Date(date.setHours(0,0,0,0));
    const s = new Date(new Date(leave.startDate).setHours(0,0,0,0));
    const e = new Date(new Date(leave.endDate).setHours(0,0,0,0));
    return d >= s && d <= e;
  };

  const visibleLeaves = useMemo(() => leaves.filter(l => filters[l.type]), [leaves, filters]);

  // Summaries
  const calculateSummary = (targetLeaves: Leave[]) => {
    const summary: Record<string, { PERSONAL: number, ANNUAL: number, SICK: number }> = {};
    targetLeaves.forEach(leave => {
      const s = new Date(leave.startDate);
      const e = new Date(leave.endDate);
      const days = Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
      if (!summary[leave.name]) summary[leave.name] = { PERSONAL: 0, ANNUAL: 0, SICK: 0 };
      summary[leave.name][leave.type] += days;
    });
    return summary;
  };

  const leavesForMonth = useMemo(() => {
    return leaves.filter(l => {
      const s = new Date(l.startDate);
      const e = new Date(l.endDate);
      return isSameMonth(s, currentDate) || isSameMonth(e, currentDate) || (s < startOfMonth(currentDate) && e > endOfMonth(currentDate));
    });
  }, [leaves, currentDate]);

  const monthlySummary = useMemo(() => calculateSummary(leavesForMonth), [leavesForMonth]);
  const annualSummary = useMemo(() => calculateSummary(leaves.filter(l => new Date(l.startDate).getFullYear() === currentDate.getFullYear())), [leaves, currentDate]);

  const SummaryTable = ({ data, title }: { data: any, title: string }) => (
    <div className="summary-compact">
      <h3 style={{ marginBottom: '8px', fontSize: '1rem' }}>{title}</h3>
      {Object.keys(data).length === 0 ? <p style={{ color: 'rgba(0,0,0,0.6)' }}>No leaves</p> : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th style={{ color: 'var(--leave-personal)' }}>P</th>
              <th style={{ color: 'var(--leave-annual)' }}>A</th>
              <th style={{ color: 'var(--leave-sick)' }}>S</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data).map(([name, counts]: [string, any]) => (
              <tr key={name}>
                <td>{name.split(' ')[0]}</td>
                <td style={{ color: counts.PERSONAL ? 'var(--leave-personal)' : undefined, fontWeight: counts.PERSONAL ? 600 : undefined }}>{counts.PERSONAL || '-'}</td>
                <td style={{ color: counts.ANNUAL ? 'var(--leave-annual)' : undefined, fontWeight: counts.ANNUAL ? 600 : undefined }}>{counts.ANNUAL || '-'}</td>
                <td style={{ color: counts.SICK ? 'var(--leave-sick)' : undefined, fontWeight: counts.SICK ? 600 : undefined }}>{counts.SICK || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="page-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-top">
          <SummaryTable data={monthlySummary} title={`Monthly Summary (${format(currentDate, 'MMM yyyy')})`} />
          <SummaryTable data={annualSummary} title={`Annual Summary (${format(currentDate, 'yyyy')})`} />
        </div>

        <div className="sidebar-bottom">
          <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>Leave Filters</h3>
          <div className="filter-list">
            <label className="filter-item">
              <input type="checkbox" className="filter-checkbox sick" checked={filters.SICK} onChange={() => toggleFilter('SICK')} />
              <span>Sick Leave</span>
            </label>
            <label className="filter-item">
              <input type="checkbox" className="filter-checkbox personal" checked={filters.PERSONAL} onChange={() => toggleFilter('PERSONAL')} />
              <span>Personal Leave</span>
            </label>
            <label className="filter-item">
              <input type="checkbox" className="filter-checkbox annual" checked={filters.ANNUAL} onChange={() => toggleFilter('ANNUAL')} />
              <span>Annual Leave</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="calendar-header">
          <button className="btn-icon" onClick={handlePrevMonth} disabled={isSameMonth(currentDate, START_DATE)}>
            &lt;
          </button>
          <button className="btn-icon" onClick={handleNextMonth}>
            &gt;
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 500, margin: 0, marginLeft: '8px' }}>
            {format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>

        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="calendar-day-header">{d}</div>
          ))}
          
          {paddingDays.map(i => (
            <div key={`pad-${i}`} className="calendar-cell disabled"></div>
          ))}

          {(() => {
            // Pre-calculate visual slots to prevent multi-day events from jumping up/down across rows
            const eventSlots: Record<string, number> = {};
            const dailySlots: Record<string, string[]> = {};
            
            const sortedLeavesForSlots = [...visibleLeaves].sort((a, b) => {
              const startDiff = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
              if (startDiff !== 0) return startDiff;
              const durA = new Date(a.endDate).getTime() - new Date(a.startDate).getTime();
              const durB = new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
              return durB - durA;
            });

            sortedLeavesForSlots.forEach(leave => {
              const start = new Date(leave.startDate);
              const end = new Date(leave.endDate);
              
              let targetSlot = 0;
              while (true) {
                let isAvailable = true;
                let d = new Date(start);
                while (d <= end) {
                  const dateStr = format(d, 'yyyy-MM-dd');
                  if (dailySlots[dateStr] && dailySlots[dateStr][targetSlot]) {
                    isAvailable = false;
                    break;
                  }
                  d.setDate(d.getDate() + 1);
                }
                if (isAvailable) break;
                targetSlot++;
              }
              
              eventSlots[leave.id] = targetSlot;
              let d = new Date(start);
              while (d <= end) {
                const dateStr = format(d, 'yyyy-MM-dd');
                if (!dailySlots[dateStr]) dailySlots[dateStr] = [];
                dailySlots[dateStr][targetSlot] = leave.id;
                d.setDate(d.getDate() + 1);
              }
            });

            return daysInMonth.map(date => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const daySlotArray = dailySlots[dateStr] || [];
              const isToday = isSameDay(date, new Date());
              
              const totalLeaves = daySlotArray.filter(Boolean).length;
              const extraLeaves = totalLeaves > 2 ? totalLeaves - 2 : 0;
              
              return (
                <div 
                  key={date.toString()} 
                  className={`calendar-cell ${isToday ? 'today' : ''}`}
                  onDoubleClick={() => openOffcanvas(date)}
                >
                  <div className="calendar-date">{format(date, 'd')}</div>
                  {[0, 1].map(slotIndex => {
                    const leaveId = daySlotArray[slotIndex];
                    if (!leaveId) {
                      return <div key={`empty-${slotIndex}`} style={{ minHeight: 24, marginBottom: 4 }}></div>;
                    }
                    
                    const leave = visibleLeaves.find(l => l.id === leaveId)!;
                    const isStart = isSameDay(date, new Date(leave.startDate));
                    const isEnd = isSameDay(date, new Date(leave.endDate));
                    const showText = isStart || date.getDay() === 0;
                    
                    return (
                      <div 
                        key={leave.id} 
                        className={`leave-item ${leave.type.toLowerCase()} ${isStart ? 'start' : ''} ${isEnd ? 'end' : ''}`}
                        onClick={(e) => { e.stopPropagation(); openOffcanvas(date, leave); }}
                      >
                        {showText && <span className="leave-name">{leave.name.split(' ')[0]}</span>}
                      </div>
                    );
                  })}
                  {extraLeaves > 0 && (
                    <div style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.6)', marginTop: '4px', fontWeight: 500, paddingLeft: '4px' }}>
                      +{extraLeaves} more
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Offcanvas Overlay & Panel */}
      {offcanvasOpen && (
        <div className="offcanvas-overlay" onClick={closeOffcanvas}></div>
      )}
      <div className={`offcanvas ${offcanvasOpen ? 'open' : ''}`}>
        <div className="offcanvas-header">
          <h2>{editId ? 'Edit Leave' : 'Add Leave'}</h2>
          <button className="btn-icon" onClick={closeOffcanvas} style={{ border: 'none', fontSize: '1.2rem' }}>&times;</button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          
          <Autocomplete
            value={formData.name}
            onChange={(val) => setFormData({...formData, name: val})}
            required
          />

          <div style={{ marginBottom: '8px', fontSize: '0.75rem', color: 'var(--primary)' }}>Leave Type</div>
          <div className="segmented-control">
            <button 
              type="button" 
              className={formData.type === 'SICK' ? 'active' : ''} 
              onClick={() => setFormData({...formData, type: 'SICK'})}
            >
              Sick
            </button>
            <button 
              type="button" 
              className={formData.type === 'PERSONAL' ? 'active' : ''} 
              onClick={() => setFormData({...formData, type: 'PERSONAL'})}
            >
              Personal
            </button>
            <button 
              type="button" 
              className={formData.type === 'ANNUAL' ? 'active' : ''} 
              onClick={() => setFormData({...formData, type: 'ANNUAL'})}
            >
              Annual
            </button>
          </div>

          <div style={{ marginBottom: '8px', fontSize: '0.75rem', color: 'var(--primary)', marginTop: '16px' }}>Select Date Range</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <DayPicker
              key={offcanvasOpen ? 'open' : 'closed'}
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              defaultMonth={dateRange?.from || new Date()}
              disabled={{ before: START_DATE }}
            />
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
            {editId && (
              <button type="button" className="btn btn-danger" onClick={handleDelete} style={{ marginRight: 'auto' }}>
                Delete
              </button>
            )}
            <button type="submit" className="btn btn-primary" style={{ width: editId ? 'auto' : '100%' }}>
              Save
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

import React from "react";
import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// Hàm chuyển đổi ngày/giờ sang ISO string với offset +07:00 (chuẩn, không lệch giờ)
function toVNISOString(dateStr: string): string {
  if (!dateStr) return '';
  // dateStr dạng 'YYYY-MM-DDTHH:mm'
  const [datePart, timePart] = dateStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  // Trả về ISO string với offset +07:00
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+07:00`;
}

// Hàm thêm offset +07:00 vào giá trị datetime-local
function toVNISOStringWithOffset(dateStr: string): string {
  if (!dateStr) return '';
  // dateStr dạng 'YYYY-MM-DDTHH:mm'
  return dateStr + ':00+07:00';
}

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    participants?: string;
  };
}

interface User {
  id: string;
  email: string;
  full_name: string;
}

const API_URL = 'https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/company_events';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw';

const Calendar: React.FC = () => {
  const { session } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("");
  const [eventParticipants, setEventParticipants] = useState("");
  const [eventMessage, setEventMessage] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const calendarsEvents = {
    Danger: "danger",
    Success: "success",
    Primary: "primary",
    Warning: "warning",
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    resetModalFields();
    // Lưu cả ngày và giờ nếu có
    const startStr = selectInfo.startStr.length > 10 ? selectInfo.startStr.slice(0, 16) : selectInfo.startStr + 'T00:00';
    // endStr luôn là end gốc (không trừ 1 phút)
    const endStr = selectInfo.endStr && selectInfo.endStr.length > 10 ? selectInfo.endStr.slice(0, 16) : (selectInfo.endStr ? selectInfo.endStr + 'T00:00' : startStr);
    setEventStartDate(startStr);
    setEventEndDate(endStr);
    openModal();
  };

  useEffect(() => {
    // Fetch events from Supabase
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('company_events')
          .select('*');

        if (error) throw error;
        
        console.log('Fetched events:', data);
        
        // Map Supabase event to FullCalendar event
        const mappedEvents = data.map((ev: any) => {
          // Convert UTC sang +7
          const toVNDate = (utcString: string) => {
            if (!utcString) return '';
            const utcDate = new Date(utcString);
            const vnDate = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
            // Trả về dạng 'YYYY-MM-DDTHH:mm'
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${vnDate.getFullYear()}-${pad(vnDate.getMonth() + 1)}-${pad(vnDate.getDate())}T${pad(vnDate.getHours())}:${pad(vnDate.getMinutes())}`;
          };
          
          const isAllDay = ev.start_time && ev.end_time &&
            new Date(ev.start_time).getHours() === 0 &&
            new Date(ev.start_time).getMinutes() === 0 &&
            new Date(ev.end_time).getHours() === 0 &&
            new Date(ev.end_time).getMinutes() === 0;

          return {
            id: ev.id,
            title: ev.title,
            start: toVNDate(ev.start_time),
            end: toVNDate(ev.end_time),
            allDay: isAllDay,
            extendedProps: { 
              calendar: ev.level || 'Primary',
              participants: ev.participants || '',
            },
          };
        });
        
        console.log('Mapped events:', mappedEvents);
        setEvents(mappedEvents);
      } catch (err) {
        console.error('Lỗi khi fetch events:', err);
        setEvents([]);
      }
    };

    if (session?.access_token) {
      fetchEvents();
    }
  }, [session]);

  useEffect(() => {
    // Fetch users from Supabase
    const fetchUsers = async () => {
      if (!session?.access_token) return;
      
      setIsLoadingUsers(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, full_name');

        if (error) throw error;
        
        setUsers(data || []);
        setFilteredUsers(data || []);
      } catch (err) {
        console.error('Lỗi khi lấy danh sách user:', err);
        setUsers([]);
        setFilteredUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [session]);

  useEffect(() => {
    // Filter users based on search term
    try {
      if (searchTerm && users.length > 0) {
        const filtered = users.filter(user => 
          (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
        setFilteredUsers(filtered);
        setShowSuggestions(true);
      } else {
        setFilteredUsers([]);
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error('Lỗi khi lọc users:', err);
      setFilteredUsers([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, users]);

  useEffect(() => {
    // Close suggestions when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    setSelectedEvent(event as unknown as CalendarEvent);
    // Lấy cả ngày và giờ nếu có
    setEventTitle(event.title);
    setEventStartDate(event.start ? event.start.toISOString().slice(0, 16) : "");
    setEventEndDate(event.end ? event.end.toISOString().slice(0, 16) : "");
    setEventLevel(event.extendedProps.calendar);
    
    // Khi edit event, cần fetch thông tin user từ danh sách ID
    if (event.extendedProps.participants) {
      const participantIds = event.extendedProps.participants.split(',');
      const selectedUsersList = users.filter(user => participantIds.includes(user.id));
      setSelectedUsers(selectedUsersList);
      setEventParticipants(event.extendedProps.participants);
    } else {
      setSelectedUsers([]);
      setEventParticipants('');
    }
    
    openModal();
  };

  const handleAddOrUpdateEvent = async () => {
    if (!session || !session.user) {
      alert('Bạn cần đăng nhập để thực hiện thao tác này');
      return;
    }

    try {
      // Thêm offset +07:00 khi gửi lên Supabase
      const startTimeVN = toVNISOStringWithOffset(eventStartDate);
      const endTimeVN = toVNISOStringWithOffset(eventEndDate);

      if (selectedEvent) {
        // Update event in Supabase
        const { data: updatedEvent, error: updateError } = await supabase
          .from('company_events')
          .update({
            title: eventTitle,
            start_time: startTimeVN,
            end_time: endTimeVN,
            level: eventLevel,
            participants: eventParticipants.split(',').filter(id => id),
          })
          .eq('id', selectedEvent.id)
          .select()
          .single();

        if (updateError) throw updateError;

        console.log('Updated event:', updatedEvent);

        // Tạo notification cho người tạo event
        const { error: creatorNotifError } = await supabase
          .from('notifications')
          .insert([{
            user_id_receiver: session.user.id,
            title: 'Cập nhật sự kiện',
            message: eventMessage || `Bạn đã cập nhật sự kiện "${eventTitle}"`,
            type: 'event_updated',
            event_id: selectedEvent.id,
            created_by_id: session.user.id,
            read: false
          }]);

        if (creatorNotifError) throw creatorNotifError;

        // Tạo notification cho người tham gia
        const participantIds = eventParticipants.split(',').filter(id => id);
        for (const participantId of participantIds) {
          const { error: participantNotifError } = await supabase
            .from('notifications')
            .insert([{
              user_id_receiver: participantId,
              title: 'Cập nhật sự kiện',
              message: eventMessage || `Sự kiện "${eventTitle}" đã được cập nhật`,
              type: 'event_updated',
              event_id: selectedEvent.id,
              created_by_id: session.user.id,
              read: false
            }]);

          if (participantNotifError) throw participantNotifError;
        }

        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event.id === selectedEvent.id
              ? {
                  ...event,
                  title: eventTitle,
                  start: startTimeVN,
                  end: endTimeVN,
                  extendedProps: { 
                    calendar: eventLevel,
                    participants: eventParticipants,
                  },
                }
              : event
          )
        );
      } else {
        // Add new event to Supabase
        const { data: newEvent, error: createError } = await supabase
          .from('company_events')
          .insert([{
            title: eventTitle,
            start_time: startTimeVN,
            end_time: endTimeVN,
            level: eventLevel,
            created_by: session.user.id,
            participants: eventParticipants.split(',').filter(id => id),
          }])
          .select()
          .single();

        if (createError) throw createError;

        console.log('Created event:', newEvent);

        if (newEvent) {
          const participantIds = eventParticipants.split(',').filter(id => id);

          // Tạo notification cho người tạo event
          const { error: creatorNotifError } = await supabase
            .from('notifications')
            .insert([{
              user_id_receiver: session.user.id,
              title: 'Sự kiện mới',
              message: eventMessage || `Bạn đã tạo sự kiện "${eventTitle}"`,
              type: 'event_created',
              event_id: newEvent.id,
              created_by_id: session.user.id,
              read: false
            }]);

          if (creatorNotifError) throw creatorNotifError;

          // Tạo notification cho người tham gia
          for (const participantId of participantIds) {
            const { error: participantNotifError } = await supabase
              .from('notifications')
              .insert([{
                user_id_receiver: participantId,
                title: 'Lời mời tham gia',
                message: eventMessage || `Bạn được mời tham gia sự kiện "${eventTitle}"`,
                type: 'event_invitation',
                event_id: newEvent.id,
                created_by_id: session.user.id,
                read: false
              }]);

            if (participantNotifError) throw participantNotifError;
          }

          // Gửi browser notification cho người tạo
          if (Notification.permission === 'granted') {
            new Notification('Sự kiện mới', {
              body: `Bạn đã tạo sự kiện "${eventTitle}"`,
              icon: '/logo.png'
            });
          }

          // Gửi browser notification cho người tham gia
          if (Notification.permission === 'granted') {
            for (const participantId of participantIds) {
              new Notification('Lời mời tham gia', {
                body: `Bạn được mời tham gia sự kiện "${eventTitle}"`,
                icon: '/logo.png'
              });
            }
          }

          setEvents((prevEvents) => [
            ...prevEvents,
            {
              id: newEvent.id,
              title: newEvent.title,
              start: startTimeVN,
              end: endTimeVN,
              allDay: true,
              extendedProps: { 
                calendar: newEvent.level || 'Primary',
                participants: eventParticipants,
              },
            },
          ]);
        }
      }
      closeModal();
      resetModalFields();
    } catch (error) {
      console.error('Lỗi khi xử lý event:', error);
      alert('Có lỗi xảy ra khi xử lý event. Vui lòng thử lại.');
    }
  };

  // Thêm useEffect để xin quyền thông báo khi component mount
  useEffect(() => {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const resetModalFields = () => {
    setEventTitle("");
    setEventStartDate("");
    setEventEndDate("");
    setEventLevel("");
    setEventParticipants("");
    setEventMessage("");
    setSelectedUsers([]);
    setSelectedEvent(null);
  };

  const handleSelectUser = (user: User) => {
    try {
      if (!selectedUsers.find(u => u.id === user.id)) {
        setSelectedUsers([...selectedUsers, user]);
        // Lưu danh sách ID thay vì tên
        setEventParticipants([...selectedUsers, user].map(u => u.id).join(','));
      }
    } catch (err) {
      console.error('Lỗi khi chọn user:', err);
    }
  };

  const handleRemoveUser = (userId: string) => {
    try {
      const newSelectedUsers = selectedUsers.filter(u => u.id !== userId);
      setSelectedUsers(newSelectedUsers);
      // Lưu danh sách ID thay vì tên
      setEventParticipants(newSelectedUsers.map(u => u.id).join(','));
    } catch (err) {
      console.error('Lỗi khi xóa user:', err);
    }
  };

  return (
    <>
      <PageMeta
        title="Calendar | TD Consulting App"
        description="Calendar page for TD Consulting App"
      />
      <div className="rounded-2xl border  border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="custom-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next addEventButton",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            selectable={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            customButtons={{
              addEventButton: {
                text: "Add Event +",
                click: openModal,
              },
            }}
          />
        </div>
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[700px] p-6 lg:p-10"
        >
          <div className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
            <div>
              <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
                {selectedEvent ? "Edit Event" : "Add Event"}
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Plan your next big moment: schedule or edit an event to stay on
                track
              </p>
            </div>
            <div className="mt-8">
              <div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Event Title
                  </label>
                  <input
                    id="event-title"
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
              </div>
              <div className="mt-6">
                <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">
                  Event Color
                </label>
                <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                  {Object.entries(calendarsEvents).map(([key, value]) => (
                    <div key={key} className="n-chk">
                      <div
                        className={`form-check form-check-${value} form-check-inline`}
                      >
                        <label
                          className="flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400"
                          htmlFor={`modal${key}`}
                        >
                          <span className="relative">
                            <input
                              className="sr-only form-check-input"
                              type="radio"
                              name="event-level"
                              value={key}
                              id={`modal${key}`}
                              checked={eventLevel === key}
                              onChange={() => setEventLevel(key)}
                            />
                            <span className="flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700">
                              <span
                                className={`h-2 w-2 rounded-full bg-white ${
                                  eventLevel === key ? "block" : "hidden"
                                }`}
                              ></span>
                            </span>
                          </span>
                          {key}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Enter Start Date
                </label>
                <div className="relative">
                  <input
                    id="event-start-date"
                    type="datetime-local"
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Enter End Date
                </label>
                <div className="relative">
                  <input
                    id="event-end-date"
                    type="datetime-local"
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Người tham gia
                </label>
                <div className="relative" ref={suggestionsRef}>
                  <div className="flex flex-wrap gap-2 p-2 min-h-[44px] border border-gray-300 rounded-lg bg-transparent dark:border-gray-700">
                    {selectedUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center gap-1 px-2 py-1 text-sm bg-gray-100 rounded-md dark:bg-gray-700"
                      >
                        <span>{user.full_name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(user.id)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <select
                      value=""
                      onChange={(e) => {
                        const user = users.find(u => u.id === e.target.value);
                        if (user) handleSelectUser(user);
                        e.target.value = '';
                      }}
                      className="flex-1 min-w-[200px] bg-transparent border-none focus:ring-0 focus:outline-none text-sm"
                    >
                      <option value="">Chọn người tham gia...</option>
                      {users
                        .filter(user => !selectedUsers.find(u => u.id === user.id))
                        .map(user => (
                          <option key={user.id} value={user.id}>
                            {user.full_name} ({user.email})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Mô tả sự kiện
                </label>
                <textarea
                  id="event-message"
                  value={eventMessage}
                  onChange={(e) => setEventMessage(e.target.value)}
                  rows={4}
                  className="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  placeholder="Nhập mô tả chi tiết về sự kiện..."
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
              <button
                onClick={closeModal}
                type="button"
                className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
              >
                Close
              </button>
              <button
                onClick={handleAddOrUpdateEvent}
                type="button"
                className="btn btn-success btn-update-event flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
              >
                {selectedEvent ? "Update Changes" : "Add Event"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

const renderEventContent = (eventInfo: any) => {
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar.toLowerCase()}`;
  return (
    <div
      className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm`}
    >
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
};

export default Calendar;

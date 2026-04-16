/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { 
  LayoutDashboard, 
  CheckCircle2, 
  Circle, 
  Plus, 
  X,
  Target, 
  Calendar, 
  MessageSquare, 
  Settings, 
  ChevronRight,
  Clock,
  Zap,
  Trash2,
  FolderKanban,
  ExternalLink,
  Lightbulb,
  Play,
  Square,
  Tag,
  BarChart3,
  ListTodo,
  Timer,
  Download,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { Project, Goal, Task } from './types';
import { CONFIG } from './config';

// Mock data for initial preview if Supabase is not connected
const MOCK_PROJECTS: Project[] = [
  { id: '1', name: 'Aprender React', description: 'Dominar hooks y patrones avanzados', created_at: new Date().toISOString(), user_id: '1', color: '#3b82f6', status: 'active' },
  { id: '2', name: 'Proyecto PWA', description: 'Crear MAR para organizar tareas', created_at: new Date().toISOString(), user_id: '1', color: '#10b981', status: 'active' },
];

const MOCK_TASKS: Task[] = [
  { id: '1', title: 'Configurar Supabase', description: 'Crear tablas y políticas', is_completed: true, is_focus: false, project_id: '2', goal_id: null, due_date: null, created_at: new Date().toISOString(), user_id: '1', status: 'done', tags: ['Backend'], subtasks: [] },
  { id: '2', title: 'Diseñar UI Principal', description: 'Usar Tailwind y Motion', is_completed: false, is_focus: true, project_id: '2', goal_id: null, due_date: null, created_at: new Date().toISOString(), user_id: '1', scheduled_time: '10:00', is_for_today: true, status: 'in_progress', tags: ['Diseño'], subtasks: [{ id: 's1', title: 'Elegir paleta', is_completed: true }, { id: 's2', title: 'Crear componentes', is_completed: false }] },
  { id: '3', title: '🔔 Recordatorio: Revisar Metas', description: '', is_completed: false, is_focus: false, project_id: '1', goal_id: null, due_date: new Date().toISOString(), created_at: new Date().toISOString(), user_id: '1', scheduled_time: '18:30', reminder_active: true, is_for_today: true, status: 'todo', tags: ['Personal'], subtasks: [] },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'tasks' | 'reminders' | 'stats' | 'admin'>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminCreatingUser, setIsAdminCreatingUser] = useState(false);
  const [newAdminUser, setNewAdminUser] = useState({ full_name: '', email: '', phone_number: '', subscription_status: 'pending' });
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [quickActionType, setQuickActionType] = useState<'task' | 'project' | 'reminder' | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDueDate, setNewProjectDueDate] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#000000');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [reminderText, setReminderText] = useState('');
  const [isForToday, setIsForToday] = useState(true);
  const [reminderActive, setReminderActive] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskComments, setNewTaskComments] = useState('');
  const [isKanban, setIsKanban] = useState(false);
  
  // Check if user is already "logged in"
  useEffect(() => {
    // Safety timeout to prevent stuck loading
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout reached, forcing load false');
        setLoading(false);
      }
    }, 5000);

    // Check custom phone auth
    const verifiedPhone = localStorage.getItem('mar_verified_phone');
    const adminAuth = localStorage.getItem('mar_admin_auth');

    if (adminAuth === 'true') {
      setIsAdmin(true);
      setUser({ id: 'admin', email: 'gaorsystempe@gmail.com', full_name: 'Administrador' });
      setLoading(false);
    } else if (verifiedPhone) {
      setUser({ id: verifiedPhone, phone: verifiedPhone });
      // Also check if the phone belongs to the admin
      if (verifiedPhone === '+51999888777') { // Reemplaza con tu número real
        setIsAdmin(true);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }

    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('mar_verified_phone');
    localStorage.removeItem('mar_admin_auth');
    window.location.reload();
  };

  // Check if it's first time or user wants help
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('focusflow_onboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('focusflow_onboarding', 'true');
    setShowOnboarding(false);
  };

  // Fetch data
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        // Fetch or Create Profile
        if (user.phone && !user.subscription_status) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('phone_number', user.phone)
            .single();

          if (profile) {
            setUser((prev: any) => ({ ...prev, ...profile }));
          } else {
            const { data: newProfile } = await supabase
              .from('profiles')
              .insert([{ 
                phone_number: user.phone, 
                full_name: 'Usuario Nuevo',
                subscription_status: 'pending' 
              }])
              .select()
              .single();
            if (newProfile) setUser((prev: any) => ({ ...prev, ...newProfile }));
          }
        }

        const { data: projectsData } = await supabase.from('projects').select('*').eq('user_id', user.id);
        const { data: tasksData } = await supabase.from('tasks').select('*').eq('user_id', user.id);
        
        if (projectsData) setProjects(projectsData);
        if (tasksData) setTasks(tasksData);

        if (isAdmin) {
          const { data: usersData } = await supabase.from('profiles').select('*');
          const { data: paymentsData } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
          if (usersData) setAllUsers(usersData);
          if (paymentsData) setAllPayments(paymentsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.id, isAdmin]);

  const updateUserSubscription = async (userId: string, status: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_status: status })
      .eq('id', userId);
    
    if (!error) {
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_status: status } : u));
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (!error) {
      setAllUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const validatePayment = async (paymentId: string, userId: string, status: 'active' | 'rejected') => {
    try {
      const { error: payError } = await supabase
        .from('payments')
        .update({ status: status === 'active' ? 'validated' : 'rejected' })
        .eq('id', paymentId);

      if (payError) throw payError;

      const { error: userError } = await supabase
        .from('profiles')
        .update({ subscription_status: status })
        .eq('id', userId);

      if (userError) throw userError;

      setAllPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: status === 'active' ? 'validated' : 'rejected' } : p));
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_status: status } : u));

      alert(status === 'active' ? 'Usuario activado con éxito' : 'Pago rechazado');
    } catch (err) {
      alert('Error al procesar la validación');
    }
  };

  const createManualUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from('profiles').insert([{
      ...newAdminUser,
      id: crypto.randomUUID(),
      updated_at: new Date().toISOString()
    }]).select();

    if (!error && data) {
      setAllUsers(prev => [...prev, data[0]]);
      setIsAdminCreatingUser(false);
      setNewAdminUser({ full_name: '', email: '', phone_number: '', subscription_status: 'pending' });
    } else {
      console.error('Error creating user:', error);
    }
  };

  const focusTask = useMemo(() => tasks.find(t => t.is_focus && !t.is_completed), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.is_completed).length, [tasks]);
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_completed: !t.is_completed } : t));
  };

  const addTask = async () => {
    if (!newTaskTitle.trim() || !user) return;
    const newTask = {
      title: newTaskTitle,
      user_id: user.id,
      project_id: selectedProjectId,
      due_date: newTaskDueDate || (isForToday ? new Date().toISOString() : null),
      is_for_today: isForToday,
      reminder_active: reminderActive,
      scheduled_time: scheduledTime,
      comments: newTaskComments,
      status: 'todo',
      tags: [],
      total_time_spent: 0
    };

    const { data, error } = await supabase.from('tasks').insert(newTask).select().single();
    
    if (data) {
      setTasks([data, ...tasks]);
      setNewTaskTitle('');
      setNewTaskDueDate('');
      setNewTaskComments('');
      setIsAddingTask(false);
      setQuickActionType(null);
      setShowQuickAction(false);
      setSelectedProjectId(null);
      setIsForToday(true);
      setReminderActive(false);
      setScheduledTime('09:00');
    }
  };

  const addProject = async () => {
    if (!newProjectName.trim() || !user) return;
    const newProject = {
      name: newProjectName,
      user_id: user.id,
      color: newProjectColor,
      due_date: newProjectDueDate || null,
      status: 'active'
    };

    const { data, error } = await supabase.from('projects').insert(newProject).select().single();
    
    if (data) {
      setProjects([data, ...projects]);
      setNewProjectName('');
      setNewProjectDueDate('');
      setNewProjectColor('#000000');
      setQuickActionType(null);
      setShowQuickAction(false);
    }
  };

  const updateProjectStatus = (id: string, status: 'active' | 'completed' | 'cancelled') => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    if (viewingProject?.id === id) {
      setViewingProject(prev => prev ? { ...prev, status } : null);
    }
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.filter(t => t.project_id !== id));
    setViewingProject(null);
  };

  const addReminder = () => {
    if (!reminderText.trim()) return;
    // For now, we'll add it as a task with a special flag or just a task
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: `🔔 Recordatorio: ${reminderText}`,
      description: 'Configurado como recordatorio',
      is_completed: false,
      is_focus: false,
      project_id: null,
      goal_id: null,
      due_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      user_id: '1',
      is_for_today: true,
      reminder_active: true,
      scheduled_time: scheduledTime,
      status: 'todo',
      tags: ['Recordatorio'],
      subtasks: []
    };
    setTasks([newTask, ...tasks]);
    setReminderText('');
    setQuickActionType(null);
    setShowQuickAction(false);
    setScheduledTime('09:00');
  };

  const generateWhatsAppReminder = () => {
    const pendingTasks = tasks.filter(t => !t.is_completed && t.is_for_today);
    const focus = focusTask ? `🎯 *MI ENFOQUE DE HOY:* ${focusTask.title}` : 'No hay tarea de enfoque hoy.';
    
    const list = pendingTasks.map(t => {
      const time = t.scheduled_time ? ` [${t.scheduled_time}]` : '';
      const reminder = t.reminder_active ? ' (🔔 Aviso -30m)' : '';
      return `- ${t.title}${time}${reminder}`;
    }).join('\n');

    const text = `🚀 *MAR - RESUMEN DIARIO*\n\n${focus}\n\n📝 *TAREAS PROGRAMADAS PARA HOY:*\n${list || 'Sin tareas para hoy.'}\n\n¡A darle con todo! 💪`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const sendTaskToWhatsApp = (task: Task) => {
    const time = task.scheduled_time ? ` a las *${task.scheduled_time}*` : '';
    const text = `🔔 *RECORDATORIO MAR*\n\nNo olvides: *${task.title}*${time}.\n\n¡Tú puedes lograrlo! 🚀`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const updateTaskStatus = (id: string, status: 'todo' | 'in_progress' | 'done') => {
    setTasks(prev => prev.map(t => t.id === id ? { 
      ...t, 
      status, 
      is_completed: status === 'done' 
    } : t));
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, is_completed: !s.is_completed } : s)
    } : t));
  };

  const addSubtask = (taskId: string, title: string) => {
    if (!title.trim()) return;
    setTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      subtasks: [...t.subtasks, { id: Math.random().toString(36).substr(2, 9), title, is_completed: false }]
    } : t));
  };

  const startTimer = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, timer_start: new Date().toISOString() } : t));
  };

  const stopTimer = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.timer_start) {
        const diff = Math.floor((new Date().getTime() - new Date(t.timer_start).getTime()) / 1000);
        return { 
          ...t, 
          timer_start: null, 
          total_time_spent: (t.total_time_spent || 0) + diff 
        };
      }
      return t;
    }));
  };

  const exportProjectToCSV = (project: Project) => {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const headers = ['Tarea', 'Estado', 'Tiempo (min)', 'Comentarios', 'Fecha Entrega'];
    const rows = projectTasks.map(t => [
      t.title,
      t.status === 'done' ? 'Completada' : t.status === 'in_progress' ? 'En Proceso' : 'Pendiente',
      Math.floor((t.total_time_spent || 0) / 60),
      t.comments || '',
      t.due_date || ''
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `MAR_Reporte_${project.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportProjectToHTML = (project: Project) => {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const completed = projectTasks.filter(t => t.is_completed).length;
    const progress = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;
    const totalTime = Math.floor(projectTasks.reduce((acc, t) => acc + (t.total_time_spent || 0), 0) / 60);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Dossier MAR - ${project.name}</title>
        <style>
          body { font-family: 'Ubuntu', sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 800px; mx-auto; padding: 40px; }
          .header { border-bottom: 2px solid #f4f4f5; padding-bottom: 20px; margin-bottom: 40px; }
          .title { font-size: 32px; font-weight: bold; margin: 0; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; background: #f4f4f5; }
          .stats { display: grid; grid-cols: 3; gap: 20px; margin-bottom: 40px; }
          .stat-card { background: #fafafa; padding: 20px; border-radius: 16px; border: 1px solid #f4f4f5; }
          .stat-val { font-size: 24px; font-weight: bold; display: block; }
          .stat-label { font-size: 10px; color: #71717a; text-transform: uppercase; font-weight: bold; }
          .task-list { list-style: none; padding: 0; }
          .task-item { padding: 15px; border-bottom: 1px solid #f4f4f5; display: flex; justify-content: space-between; align-items: center; }
          .task-title { font-weight: bold; }
          .task-meta { font-size: 12px; color: #71717a; }
          .footer { margin-top: 60px; font-size: 12px; color: #a1a1aa; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <p class="stat-label">Reporte de Proyecto MAR</p>
          <h1 class="title">${project.name}</h1>
          <p>${project.description || 'Sin descripción.'}</p>
        </div>
        <div class="stats" style="display: flex; gap: 20px;">
          <div class="stat-card" style="flex: 1;">
            <span class="stat-label">Progreso</span>
            <span class="stat-val">${progress}%</span>
          </div>
          <div class="stat-card" style="flex: 1;">
            <span class="stat-label">Tiempo Total</span>
            <span class="stat-val">${totalTime} min</span>
          </div>
          <div class="stat-card" style="flex: 1;">
            <span class="stat-label">Tareas</span>
            <span class="stat-val">${projectTasks.length}</span>
          </div>
        </div>
        <h2>Lista de Tareas</h2>
        <ul class="task-list">
          ${projectTasks.map(t => `
            <li class="task-item">
              <div>
                <div class="task-title">${t.is_completed ? '✅' : '⭕'} ${t.title}</div>
                <div class="task-meta">${t.comments || ''}</div>
              </div>
              <div class="task-meta">
                ${Math.floor((t.total_time_spent || 0) / 60)} min
              </div>
            </li>
          `).join('')}
        </ul>
        <div class="footer">
          Generado por MAR - Tu mar de ideas aquí. ${new Date().toLocaleDateString()}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Dossier_MAR_${project.name.replace(/\s+/g, '_')}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white">
            <Lightbulb className="w-6 h-6 fill-white" />
          </div>
          <p className="text-text-sub font-medium">Cargando MAR...</p>
        </motion.div>
      </div>
    );
  }

  const hostname = window.location.hostname;
  const isSaaS = hostname === 'app.mariasuite.cloud';

  if (!isSaaS) {
    return <Portal />;
  }

  if (user && user.subscription_status === 'pending' && !isAdmin) {
    return <PaymentPortal user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-white text-black selection:bg-zinc-200 font-sans">
      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-border px-6 py-3 flex justify-around items-center md:top-0 md:bottom-auto md:left-0 md:w-20 md:h-screen md:flex-col md:border-r md:border-t-0 z-50 safe-bottom">
        <div className="hidden md:flex mb-8">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            <Lightbulb className="w-6 h-6 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
        <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard className="w-5 h-5" />} label="Inicio" />
        <NavItem active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} icon={<FolderKanban className="w-5 h-5" />} label="Proyectos" />
        <NavItem active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckCircle2 className="w-5 h-5" />} label="Tareas" />
        <NavItem active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<BarChart3 className="w-5 h-5" />} label="Stats" />
        <NavItem active={activeTab === 'reminders'} onClick={() => setActiveTab('reminders')} icon={<MessageSquare className="w-5 h-5" />} label="WhatsApp" />
        {isAdmin && (
          <NavItem 
            active={activeTab === 'admin'} 
            onClick={() => setActiveTab('admin')} 
            icon={<Settings className="text-yellow-500 w-5 h-5" />} 
            label="ADMIN" 
            className="border-2 border-yellow-400/20 bg-yellow-50/50"
          />
        )}
        <NavItem active={false} onClick={handleLogout} icon={<Settings className="w-5 h-5" />} label="Salir" className="md:hidden" />
        <div className="hidden md:flex mt-auto">
          <NavItem active={false} onClick={handleLogout} icon={<Settings className="w-5 h-5" />} label="Salir" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="pb-32 pt-6 px-4 md:pl-28 md:pr-12 max-w-7xl mx-auto">
        {/* Flow Guide Modal */}
        <AnimatePresence>
          {showGuide && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowGuide(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                className="bg-white rounded-[32px] w-full max-w-2xl p-8 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
                      <Lightbulb className="w-6 h-6 fill-white" />
                    </div>
                    <h2 className="text-2xl font-bold">Metodología MAR</h2>
                  </div>
                  <button onClick={() => setShowGuide(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                    <Plus className="w-6 h-6 rotate-45" />
                  </button>
                </div>

                <div className="space-y-10 pb-4">
                  <section className="bg-zinc-900 text-white p-6 rounded-[24px] space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-yellow-400">
                      <Zap className="w-5 h-5 fill-yellow-400" />
                      Novedades en MAR
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-yellow-400 text-black rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">NEW</div>
                        <p className="text-sm">Tablero Kanban: Organiza tus tareas visualmente por estados.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-yellow-400 text-black rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">NEW</div>
                        <p className="text-sm">Temporizador: Mide tu tiempo de enfoque real con un solo clic.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-yellow-400 text-black rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">NEW</div>
                        <p className="text-sm">Dossier MAR: Exporta reportes profesionales en HTML o Excel.</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-amber-600">
                      <FolderKanban className="w-5 h-5" />
                      Flujo de Proyectos
                    </h3>
                    <p className="text-sm text-text-sub">Son los contenedores de tus grandes metas. Su finalidad es darte una visión panorámica.</p>
                    <div className="grid grid-cols-1 gap-2">
                      <GuideStep num="1" text="Define una meta grande (ej. 'Lanzar mi App')." />
                      <GuideStep num="2" text="Desglosa en tareas accionables dentro del proyecto." />
                      <GuideStep num="3" text="Visualiza el progreso real hacia tu objetivo final." />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-blue-600">
                      <CheckCircle2 className="w-5 h-5" />
                      Flujo de Tareas y Kanban
                    </h3>
                    <p className="text-sm text-text-sub">Pasos atómicos para reducir la parálisis. Ahora con vista de tablero para mayor control.</p>
                    <div className="grid grid-cols-1 gap-2">
                      <GuideStep num="1" text="Usa el Tablero Kanban para mover tareas entre 'Por Hacer', 'En Proceso' y 'Hecho'." />
                      <GuideStep num="2" text="Desglosa tareas complejas en Subtareas para avanzar paso a paso." />
                      <GuideStep num="3" text="Activa el Temporizador (Play) para medir tu enfoque real en cada tarea." />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-purple-600">
                      <BarChart3 className="w-5 h-5" />
                      Estadísticas y Reportes
                    </h3>
                    <p className="text-sm text-text-sub">Mide tu éxito y documenta tus logros de forma profesional.</p>
                    <div className="grid grid-cols-1 gap-2">
                      <GuideStep num="1" text="Revisa la pestaña de Estadísticas para ver tu rendimiento semanal." />
                      <GuideStep num="2" text="Exporta el 'Dossier MAR' (HTML) para tener un reporte visual de tus proyectos." />
                      <GuideStep num="3" text="Descarga tus datos en Excel (CSV) para un control administrativo total." />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-600">
                      <MessageSquare className="w-5 h-5" />
                      Flujo de WhatsApp
                    </h3>
                    <p className="text-sm text-text-sub">Es tu compromiso externo. Su finalidad es sacarte de la app al mundo real.</p>
                    <div className="grid grid-cols-1 gap-2">
                      <GuideStep num="1" text="Genera tu resumen diario (Enfoque + Tareas de hoy)." />
                      <GuideStep num="2" text="Envíatelo a ti mismo para 'fijar' el plan en tu mente." />
                      <GuideStep num="3" text="Siente el alivio al ver tu plan trazado en tu chat." />
                    </div>
                  </section>
                </div>

                <button 
                  onClick={() => setShowGuide(false)}
                  className="w-full bg-black text-white py-4 rounded-2xl font-bold mt-4"
                >
                  Entendido, ¡a por ello!
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Quick Action Trigger (Floating Button) */}
        <button 
          onClick={() => setShowQuickAction(true)}
          className="fixed bottom-24 right-6 md:bottom-10 md:right-10 w-16 h-16 bg-black text-white rounded-full shadow-2xl flex items-center justify-center z-[60] hover:scale-110 active:scale-95 transition-all"
        >
          <Plus className="w-8 h-8" />
        </button>

        {/* Quick Action Modal */}
        <AnimatePresence>
          {showQuickAction && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowQuickAction(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative z-10 space-y-6"
              >
                {!quickActionType ? (
                  <>
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold">¿Qué deseas hacer hoy?</h2>
                      <p className="text-text-sub text-sm">Elige una opción para empezar a organizar tu día.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => setQuickActionType('task')}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-border hover:bg-zinc-50 transition-colors text-left group"
                      >
                        <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold">Crear una Tarea</p>
                          <p className="text-xs text-text-sub">Añade algo a tu lista de pendientes.</p>
                        </div>
                      </button>
                      <button 
                        onClick={() => setQuickActionType('project')}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-border hover:bg-zinc-50 transition-colors text-left group"
                      >
                        <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                          <FolderKanban className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold">Nuevo Proyecto</p>
                          <p className="text-xs text-text-sub">Define una meta grande y estructurada.</p>
                        </div>
                      </button>
                      <button 
                        onClick={() => setQuickActionType('reminder')}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-border hover:bg-zinc-50 transition-colors text-left group"
                      >
                        <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold">Configurar Recordatorio</p>
                          <p className="text-xs text-text-sub">No olvides lo más importante.</p>
                        </div>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQuickActionType(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                        <ChevronRight className="w-5 h-5 rotate-180" />
                      </button>
                      <h2 className="text-xl font-bold">
                        {quickActionType === 'task' && 'Nueva Tarea'}
                        {quickActionType === 'project' && 'Nuevo Proyecto'}
                        {quickActionType === 'reminder' && 'Nuevo Recordatorio'}
                      </h2>
                    </div>

                    {quickActionType === 'task' && (
                      <div className="space-y-6">
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="¿Qué necesitas hacer?" 
                          className="w-full text-lg font-medium outline-none p-4 bg-zinc-50 rounded-2xl border border-transparent focus:border-black transition-all"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addTask()}
                        />
                        
                        <div className="space-y-4 bg-zinc-50 p-4 rounded-2xl border border-border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FolderKanban className="w-4 h-4 text-text-sub" />
                              <span className="text-sm font-bold">Proyecto</span>
                            </div>
                            <select 
                              value={selectedProjectId || ''} 
                              onChange={(e) => setSelectedProjectId(e.target.value || null)}
                              className="bg-white border border-border rounded-lg px-2 py-1 text-sm font-bold outline-none focus:border-black"
                            >
                              <option value="">Ninguno</option>
                              {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-text-sub" />
                              <span className="text-sm font-bold">¿Es para hoy?</span>
                            </div>
                            <button 
                              onClick={() => setIsForToday(!isForToday)}
                              className={`w-10 h-6 rounded-full transition-colors relative ${isForToday ? 'bg-black' : 'bg-zinc-200'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isForToday ? 'left-5' : 'left-1'}`} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-text-sub" />
                              <span className="text-sm font-bold">Hora asignada</span>
                            </div>
                            <input 
                              type="time" 
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              className="bg-white border border-border rounded-lg px-2 py-1 text-sm font-bold outline-none focus:border-black"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-text-sub" />
                              <span className="text-sm font-bold">Recordar 30 min antes</span>
                            </div>
                            <button 
                              onClick={() => setReminderActive(!reminderActive)}
                              className={`w-10 h-6 rounded-full transition-colors relative ${reminderActive ? 'bg-black' : 'bg-zinc-200'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${reminderActive ? 'left-5' : 'left-1'}`} />
                            </button>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-text-sub" />
                              <span className="text-sm font-bold">Fecha de culminación</span>
                            </div>
                            <input 
                              type="date" 
                              value={newTaskDueDate}
                              onChange={(e) => setNewTaskDueDate(e.target.value)}
                              className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-black"
                            />
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-text-sub" />
                              <span className="text-sm font-bold">Comentario / Notas</span>
                            </div>
                            <textarea 
                              placeholder="Añade detalles adicionales..."
                              value={newTaskComments}
                              onChange={(e) => setNewTaskComments(e.target.value)}
                              className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-black min-h-[80px] resize-none"
                            />
                          </div>
                        </div>

                        <button onClick={addTask} className="w-full apple-button py-4">Guardar Tarea</button>
                      </div>
                    )}

                    {quickActionType === 'project' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-text-sub ml-1">Nombre del Proyecto</label>
                          <input 
                            autoFocus
                            type="text" 
                            placeholder="Ej. Lanzar mi App" 
                            className="w-full text-lg font-medium outline-none p-4 bg-zinc-50 rounded-2xl border border-transparent focus:border-black transition-all"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addProject()}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-text-sub ml-1">Fecha de Entrega (Opcional)</label>
                          <input 
                            type="date" 
                            className="w-full text-lg font-medium outline-none p-4 bg-zinc-50 rounded-2xl border border-transparent focus:border-black transition-all"
                            value={newProjectDueDate}
                            onChange={(e) => setNewProjectDueDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-text-sub ml-1">Color del Proyecto</label>
                          <div className="flex gap-2">
                            {['#000000', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(c => (
                              <button 
                                key={c}
                                onClick={() => setNewProjectColor(c)}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${newProjectColor === c ? 'border-black scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                        <button onClick={addProject} className="w-full apple-button py-4">Crear Proyecto</button>
                      </div>
                    )}

                    {quickActionType === 'reminder' && (
                      <div className="space-y-6">
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="¿Sobre qué te recordamos?" 
                          className="w-full text-lg font-medium outline-none p-4 bg-zinc-50 rounded-2xl border border-transparent focus:border-black transition-all"
                          value={reminderText}
                          onChange={(e) => setReminderText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addReminder()}
                        />
                        
                        <div className="space-y-4 bg-zinc-50 p-4 rounded-2xl border border-border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-text-sub" />
                              <span className="text-sm font-bold">Hora del recordatorio</span>
                            </div>
                            <input 
                              type="time" 
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              className="bg-white border border-border rounded-lg px-2 py-1 text-sm font-bold outline-none focus:border-black"
                            />
                          </div>
                        </div>

                        <div className="p-4 bg-accent-soft rounded-2xl text-xs text-text-sub font-medium">
                          Este recordatorio se añadirá a tu lista y se incluirá en tu resumen de WhatsApp para la hora asignada.
                        </div>
                        <button onClick={addReminder} className="w-full apple-button py-4">Configurar</button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showOnboarding && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-white/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white border border-border p-8 rounded-[32px] max-w-lg w-full shadow-2xl space-y-6"
              >
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white">
                  <Lightbulb className="w-6 h-6 fill-white" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight">Bienvenido a MAR</h2>
                  <p className="text-text-sub">Tu sistema minimalista para dejar de procrastinar y empezar a cumplir.</p>
                </div>
                
                <div className="space-y-4 py-4">
                  <OnboardingStep 
                    number="1" 
                    title="Crea un Proyecto" 
                    desc="Define hacia dónde vas (ej. 'Lanzar mi App')." 
                  />
                  <OnboardingStep 
                    number="2" 
                    title="Añade Tareas" 
                    desc="Divide tu proyecto en pasos pequeños y accionables." 
                  />
                  <OnboardingStep 
                    number="3" 
                    title="Elige tu Enfoque" 
                    desc="Marca UNA tarea como enfoque del día. Solo una." 
                  />
                  <OnboardingStep 
                    number="4" 
                    title="Comparte y Cumple" 
                    desc="Envía tu resumen a WhatsApp para comprometerte." 
                  />
                </div>

                <button 
                  onClick={completeOnboarding}
                  className="w-full apple-button py-4 text-lg"
                >
                  Comenzar ahora
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <header className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                    <Lightbulb className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-900">MAR</h1>
                </div>
                <button 
                  onClick={() => setShowGuide(true)}
                  className="user-status bg-white px-4 py-2 rounded-full border border-border text-xs font-bold uppercase tracking-widest text-text-sub hover:text-text-main transition-colors"
                >
                  Guía de Flujo
                </button>
              </header>

              <div className="bento-grid">
                {/* Hero Section: Daily Goal */}
                <section className="card-bento col-span-1 md:col-span-2 bg-zinc-900 text-white border-none min-h-[280px] shadow-xl shadow-zinc-200">
                  <div className="card-title-bento text-white/50">
                    <span>Enfoque del Día</span>
                    <span>{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div className="mt-auto">
                    {focusTask ? (
                      <div className="space-y-4">
                        <h2 className="text-4xl font-bold leading-tight tracking-tight">{focusTask.title}</h2>
                        <p className="text-white/60 text-lg font-medium">{focusTask.description || 'Prioridad máxima • Hoy'}</p>
                        <button 
                          onClick={() => toggleTask(focusTask.id)}
                          className="bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-zinc-100 transition-all active:scale-95 mt-4"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          Completar ahora
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h2 className="text-4xl font-bold leading-tight tracking-tight">¿Cuál es tu enfoque?</h2>
                        <p className="text-white/60 text-lg font-medium">No has seleccionado una tarea de enfoque para hoy.</p>
                        <button 
                          onClick={() => setActiveTab('tasks')}
                          className="bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-zinc-100 transition-all active:scale-95 mt-4"
                        >
                          <Plus className="w-5 h-5" />
                          Elegir enfoque
                        </button>
                      </div>
                    )}
                  </div>
                </section>

                {/* Quick Tasks - TODAY (Blueish) */}
                <div className="card-bento col-span-1 bg-blue-50/50 border-blue-100">
                  <div className="card-title-bento text-blue-600">Hoy</div>
                  <div className="space-y-1 overflow-y-auto max-h-[200px] custom-scrollbar">
                    {tasks.filter(t => !t.is_completed && t.is_for_today).slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center gap-3 py-2.5 border-b border-blue-100/50 last:border-0 group">
                        <button onClick={() => toggleTask(task.id)} className="w-5 h-5 border border-blue-200 rounded-full hover:border-blue-500 transition-colors flex items-center justify-center bg-white">
                          <CheckCircle2 className="w-3 h-3 text-transparent group-hover:text-blue-200" />
                        </button>
                        <div className="flex-1 truncate">
                          <span className="text-sm font-medium text-blue-900">{task.title}</span>
                          {task.scheduled_time && (
                            <span className="text-[9px] font-bold text-blue-400 ml-2">{task.scheduled_time}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {tasks.filter(t => !t.is_completed && t.is_for_today).length === 0 && (
                      <div className="py-8 text-center space-y-2">
                        <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">Día despejado</p>
                        <button onClick={() => setShowQuickAction(true)} className="text-[10px] font-bold text-blue-600 underline">Añadir algo</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* WhatsApp Card (Greenish) */}
                <div className="card-bento col-span-1 bg-emerald-50/50 border-emerald-100 justify-center items-center text-center">
                  <div className="text-[10px] font-bold tracking-[0.2em] text-emerald-600 mb-4 uppercase">Compromiso</div>
                  <div className="text-emerald-900 text-xl font-bold leading-tight mb-4 tracking-tight">
                    Enviar resumen<br/>a WhatsApp
                  </div>
                  <button 
                    onClick={generateWhatsAppReminder}
                    className="w-12 h-12 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-200 flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <MessageSquare className="w-5 h-5 fill-white" />
                  </button>
                </div>

                {/* Projects Card (Amber/Orange) */}
                <div className="card-bento col-span-1 bg-amber-50/50 border-amber-100">
                  <div className="card-title-bento text-amber-600">Proyectos</div>
                  <div className="space-y-5">
                    {projects.slice(0, 2).map(project => (
                      <div key={project.id} className="space-y-2">
                        <div className="flex justify-between text-xs font-bold tracking-tight text-amber-900">
                          <span>{project.name}</span>
                          <span className="text-amber-500">35%</span>
                        </div>
                        <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: '35%' }} />
                        </div>
                      </div>
                    ))}
                    {projects.length === 0 && (
                      <button onClick={() => setActiveTab('projects')} className="w-full py-8 border border-dashed border-amber-200 rounded-xl text-amber-400 text-xs font-bold uppercase tracking-widest hover:border-amber-500 hover:text-amber-600 transition-colors bg-white/50">
                        Nuevo Proyecto
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats/Goals Card */}
                <div className="card-bento col-span-1 md:col-span-2 bg-accent-soft/50">
                  <div className="card-title-bento">Estadísticas</div>
                  <div className="grid grid-cols-2 gap-3 flex-grow">
                    <StatItem label="Racha" val="12 🔥" />
                    <StatItem label="Completadas" val={completedTasks.toString()} />
                    <StatItem label="Progreso" val={`${Math.round(progress)}%`} />
                    <StatItem label="Proyectos" val={projects.length.toString()} />
                  </div>
                </div>

                {/* Motivation Card */}
                <div className="card-bento col-span-1 md:col-span-2 overflow-hidden relative group">
                  <img 
                    src="https://images.unsplash.com/photo-1494173853739-c21f58b16055?auto=format&fit=crop&q=80&w=1000" 
                    alt="Inspiration" 
                    className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:scale-105 transition-transform duration-1000"
                    referrerPolicy="no-referrer"
                  />
                  <div className="relative z-10 h-full flex flex-col justify-center py-4">
                    <div className="card-title-bento mb-2">Inspiración</div>
                    <p className="text-2xl font-bold tracking-tight leading-tight mb-2 italic">
                      "El éxito es la suma de pequeños esfuerzos repetidos día tras día."
                    </p>
                    <p className="text-text-sub text-sm font-medium">— Robert Collier</p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black">
                      <Zap className="w-4 h-4 fill-black" />
                      <span>Sigue mejorando, vas por buen camino</span>
                    </div>
                  </div>
                </div>

                {/* Quick Entry Card */}
                <button 
                  onClick={() => setIsAddingTask(true)}
                  className="card-bento col-span-1 bg-black text-white hover:bg-zinc-800 transition-colors cursor-pointer group"
                >
                  <div className="card-title-bento text-white/40">Acceso Rápido</div>
                  <div className="flex-grow flex items-center justify-center text-6xl font-extralight group-hover:scale-110 transition-transform">+</div>
                  <div className="text-[10px] text-center text-white/50 font-bold uppercase tracking-widest">Nueva Tarea</div>
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div 
              key="tasks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Mis Tareas</h1>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setIsKanban(false)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${!isKanban ? 'bg-white shadow-sm' : 'text-text-sub'}`}
                    >
                      Lista
                    </button>
                    <button 
                      onClick={() => setIsKanban(true)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${isKanban ? 'bg-white shadow-sm' : 'text-text-sub'}`}
                    >
                      Tablero
                    </button>
                  </div>
                  <button 
                    onClick={() => setIsAddingTask(true)}
                    className="apple-button p-2"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              </header>

              {isAddingTask && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-6 rounded-[20px] border border-black shadow-sm"
                >
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="¿Qué necesitas hacer?" 
                    className="w-full text-lg font-medium outline-none"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setIsAddingTask(false)} className="px-4 py-2 text-text-sub font-bold text-sm">Cancelar</button>
                    <button onClick={addTask} className="apple-button">Guardar Tarea</button>
                  </div>
                </motion.div>
              )}

              {!isKanban ? (
                <div className="bg-white border border-border rounded-[20px] overflow-hidden divide-y divide-border">
                  {tasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onToggle={() => toggleTask(task.id)} 
                      onSend={() => sendTaskToWhatsApp(task)}
                      onAddSubtask={(title) => addSubtask(task.id, title)}
                      onToggleSubtask={(sid) => toggleSubtask(task.id, sid)}
                      onStartTimer={() => startTimer(task.id)}
                      onStopTimer={() => stopTimer(task.id)}
                      showProject 
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
                  {(['todo', 'in_progress', 'done'] as const).map(status => (
                    <div key={status} className="flex flex-col gap-4 bg-zinc-50 p-4 rounded-[32px] border border-zinc-100">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="font-bold uppercase tracking-widest text-[10px] text-text-sub">
                          {status === 'todo' ? 'Por Hacer' : status === 'in_progress' ? 'En Proceso' : 'Hecho'}
                        </h3>
                        <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold border border-zinc-200">
                          {tasks.filter(t => t.status === status).length}
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                        {tasks.filter(t => t.status === status).map(task => (
                          <motion.div 
                            layoutId={task.id}
                            key={task.id} 
                            className="bg-white p-4 rounded-2xl border border-border shadow-sm hover:border-black transition-all cursor-pointer group"
                          >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-bold text-sm leading-tight">{task.title}</p>
                      <motion.button 
                        whileHover={{ scale: 1.2, x: 5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextStatus = status === 'todo' ? 'in_progress' : status === 'in_progress' ? 'done' : 'todo';
                          updateTaskStatus(task.id, nextStatus);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${status === 'in_progress' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'hover:bg-zinc-100 text-zinc-400'}`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    </div>

                    {/* Confetti on Kanban card if done */}
                    {status === 'done' && (
                      <div className="absolute inset-0 pointer-events-none">
                        {[...Array(4)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ 
                              scale: [0, 1, 0],
                              x: (i % 2 === 0 ? 1 : -1) * 20,
                              y: (i < 2 ? 1 : -1) * 20,
                              opacity: 0
                            }}
                            transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                            className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full bg-yellow-400"
                          />
                        ))}
                      </div>
                    )}
                            {task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {task.tags.map(tag => (
                                  <span key={tag} className="text-[8px] font-bold uppercase tracking-widest bg-zinc-100 px-1.5 py-0.5 rounded-md">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[9px] font-bold text-text-sub uppercase tracking-widest">
                              <div className="flex items-center gap-1">
                                <ListTodo className="w-3 h-3" />
                                <span>{task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length}</span>
                              </div>
                              {task.total_time_spent ? (
                                <div className="flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  <span>{Math.floor(task.total_time_spent / 60)}m</span>
                                </div>
                              ) : null}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'projects' && !viewingProject && (
            <motion.div 
              key="projects"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Proyectos</h1>
                <button 
                  onClick={() => {
                    setQuickActionType('project');
                    setShowQuickAction(true);
                  }}
                  className="apple-button flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {projects.map(project => {
                  const projectTasks = tasks.filter(t => t.project_id === project.id);
                  const completedProjectTasks = projectTasks.filter(t => t.is_completed).length;
                  const projectProgress = projectTasks.length > 0 ? (completedProjectTasks / projectTasks.length) * 100 : 0;
                  
                  return (
                    <div 
                      key={project.id} 
                      onClick={() => setViewingProject(project)}
                      className="card-bento hover:border-black group cursor-pointer relative overflow-hidden"
                    >
                      <div 
                        className="absolute top-0 left-0 w-1 h-full" 
                        style={{ backgroundColor: project.color }}
                      />
                      <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center bg-accent-soft text-black">
                        <FolderKanban className="w-6 h-6" style={{ color: project.color }} />
                      </div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold group-hover:underline transition-all">{project.name}</h3>
                        <div className="flex flex-col items-end gap-1">
                          {project.due_date && (
                            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full uppercase tracking-widest">
                              {new Date(project.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                            project.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            project.status === 'cancelled' ? 'bg-zinc-100 text-zinc-500' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {project.status === 'active' ? 'Activo' : project.status === 'completed' ? 'Completado' : 'Cancelado'}
                          </span>
                        </div>
                      </div>
                      <p className="text-text-sub text-sm mb-6 line-clamp-2">
                        {projectTasks.length} tareas • {completedProjectTasks} completadas
                      </p>
                      <div className="mt-auto">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-sub mb-2">
                          <span>Progreso</span>
                          <span>{Math.round(projectProgress)}%</span>
                        </div>
                        <div className="h-1 bg-accent-soft rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500" 
                            style={{ width: `${projectProgress}%`, backgroundColor: project.color || '#000000' }} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'projects' && viewingProject && (
            <motion.div 
              key="project-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <button 
                onClick={() => setViewingProject(null)}
                className="flex items-center gap-2 text-text-sub hover:text-black transition-colors font-bold text-sm uppercase tracking-widest"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Volver a Proyectos
              </button>

              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: viewingProject.color }}>
                      <FolderKanban className="w-6 h-6" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight">{viewingProject.name}</h1>
                  </div>
                  <p className="text-text-sub">{viewingProject.description || 'Sin descripción adicional.'}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => updateProjectStatus(viewingProject.id, 'active')}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${viewingProject.status === 'active' ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                  >
                    Activo
                  </button>
                  <button 
                    onClick={() => updateProjectStatus(viewingProject.id, 'completed')}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${viewingProject.status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                  >
                    Completado
                  </button>
                  <button 
                    onClick={() => updateProjectStatus(viewingProject.id, 'cancelled')}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${viewingProject.status === 'cancelled' ? 'bg-zinc-600 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                  >
                    Cancelado
                  </button>
                  <button 
                    onClick={() => {
                      if(confirm('¿Estás seguro de eliminar este proyecto y todas sus tareas?')) {
                        deleteProject(viewingProject.id);
                      }
                    }}
                    className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Tareas del Proyecto</h2>
                    <button 
                      onClick={() => {
                        setSelectedProjectId(viewingProject.id);
                        setQuickActionType('task');
                        setShowQuickAction(true);
                      }}
                      className="text-sm font-bold text-blue-600 hover:underline"
                    >
                      + Añadir Tarea
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {tasks.filter(t => t.project_id === viewingProject.id).length > 0 ? (
                      tasks.filter(t => t.project_id === viewingProject.id).map(task => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          onToggle={() => toggleTask(task.id)} 
                          onSend={() => sendTaskToWhatsApp(task)}
                          onAddSubtask={(title) => addSubtask(task.id, title)}
                          onToggleSubtask={(sid) => toggleSubtask(task.id, sid)}
                          onStartTimer={() => startTimer(task.id)}
                          onStopTimer={() => stopTimer(task.id)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12 bg-zinc-50 rounded-[32px] border border-dashed border-zinc-200">
                        <p className="text-text-sub font-medium">No hay tareas en este proyecto aún.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="card-bento bg-zinc-50 border-none">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-text-sub mb-4">Detalles</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-text-sub">Creado</span>
                        <span className="text-sm font-medium">{new Date(viewingProject.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-text-sub">Entrega</span>
                        <span className="text-sm font-medium text-red-500">
                          {viewingProject.due_date ? new Date(viewingProject.due_date).toLocaleDateString() : 'Sin fecha'}
                        </span>
                      </div>
                      <div className="pt-4 border-t border-zinc-200">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-sub mb-2">
                          <span>Progreso Total</span>
                          <span>{Math.round(tasks.filter(t => t.project_id === viewingProject.id && t.is_completed).length / (tasks.filter(t => t.project_id === viewingProject.id).length || 1) * 100)}%</span>
                        </div>
                        <div className="h-2 bg-white rounded-full overflow-hidden border border-zinc-200">
                          <div 
                            className="h-full transition-all duration-500" 
                            style={{ 
                              width: `${(tasks.filter(t => t.project_id === viewingProject.id && t.is_completed).length / (tasks.filter(t => t.project_id === viewingProject.id).length || 1) * 100)}%`,
                              backgroundColor: viewingProject.color 
                            }} 
                          />
                        </div>
                      </div>

                      <div className="pt-6 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-sub">Exportar Reporte</p>
                        <button 
                          onClick={() => exportProjectToHTML(viewingProject)}
                          className="w-full flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-xl hover:border-black transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <FileText className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold">Dossier MAR (HTML)</span>
                          </div>
                          <Download className="w-4 h-4 text-zinc-300 group-hover:text-black" />
                        </button>
                        <button 
                          onClick={() => exportProjectToCSV(viewingProject)}
                          className="w-full flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-xl hover:border-black transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                              <FileSpreadsheet className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold">Datos Excel (CSV)</span>
                          </div>
                          <Download className="w-4 h-4 text-zinc-300 group-hover:text-black" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <h1 className="text-3xl font-bold tracking-tight">Estadísticas de MAR</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-bento bg-zinc-900 text-white border-none">
                  <div className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">Total Completado</div>
                  <div className="text-4xl font-bold">{completedTasks}</div>
                  <div className="text-white/30 text-xs mt-2">Tareas finalizadas con éxito</div>
                </div>
                <div className="card-bento bg-blue-50 border-blue-100">
                  <div className="text-blue-600/50 text-[10px] font-bold uppercase tracking-widest mb-2">Tiempo Enfocado</div>
                  <div className="text-4xl font-bold text-blue-900">
                    {Math.floor(tasks.reduce((acc, t) => acc + (t.total_time_spent || 0), 0) / 60)}m
                  </div>
                  <div className="text-blue-600/30 text-xs mt-2">Minutos de trabajo real</div>
                </div>
                <div className="card-bento bg-emerald-50 border-emerald-100">
                  <div className="text-emerald-600/50 text-[10px] font-bold uppercase tracking-widest mb-2">Proyectos Activos</div>
                  <div className="text-4xl font-bold text-emerald-900">{projects.filter(p => p.status === 'active').length}</div>
                  <div className="text-emerald-600/30 text-xs mt-2">En curso actualmente</div>
                </div>
              </div>

              <div className="card-bento">
                <h3 className="text-lg font-bold mb-6">Rendimiento Semanal</h3>
                <div className="h-48 flex items-end gap-2">
                  {[40, 70, 45, 90, 65, 80, 30].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        className="w-full bg-zinc-100 rounded-t-lg hover:bg-black transition-colors"
                      />
                      <span className="text-[10px] font-bold text-text-sub">
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && isAdmin && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black tracking-tighter">Panel de Administración</h2>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsAdminCreatingUser(true)}
                    className="bg-black text-white px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Usuario
                  </button>
                  <div className="bg-zinc-100 text-black px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    {allUsers.length} Usuarios
                  </div>
                </div>
              </div>

              {isAdminCreatingUser && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-50 p-6 rounded-[32px] border border-border space-y-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold uppercase tracking-widest">Registrar Usuario Manualmente</h3>
                    <button onClick={() => setIsAdminCreatingUser(false)} className="text-text-sub hover:text-black">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={createManualUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      placeholder="Nombre Completo"
                      className="bg-white border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-black"
                      value={newAdminUser.full_name}
                      onChange={e => setNewAdminUser({...newAdminUser, full_name: e.target.value})}
                      required
                    />
                    <input 
                      placeholder="Email"
                      type="email"
                      className="bg-white border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-black"
                      value={newAdminUser.email}
                      onChange={e => setNewAdminUser({...newAdminUser, email: e.target.value})}
                      required
                    />
                    <input 
                      placeholder="Teléfono (ej: +51999888777)"
                      className="bg-white border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-black"
                      value={newAdminUser.phone_number}
                      onChange={e => setNewAdminUser({...newAdminUser, phone_number: e.target.value})}
                      required
                    />
                    <select 
                      className="bg-white border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-black"
                      value={newAdminUser.subscription_status}
                      onChange={e => setNewAdminUser({...newAdminUser, subscription_status: e.target.value})}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="active">Activo</option>
                    </select>
                    <button className="md:col-span-2 bg-black text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all">
                      Crear Usuario
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Sección de Pagos Pendientes */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Pagos por Validar ({allPayments.filter(p => p.status === 'pending').length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allPayments.filter(p => p.status === 'pending').map(payment => (
                    <div key={payment.id} className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{payment.method === 'yape' ? 'YAPE' : 'BCP'}</p>
                          <p className="font-bold text-lg">{payment.phone}</p>
                        </div>
                        <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">Pendiente</div>
                      </div>
                      <div className="bg-zinc-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Código de Operación</p>
                        <p className="font-mono font-bold text-lg">{payment.payment_code}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => validatePayment(payment.id, payment.user_id, 'active')}
                          className="flex-1 bg-green-600 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition-all"
                        >
                          Validar y Activar
                        </button>
                        <button 
                          onClick={() => validatePayment(payment.id, payment.user_id, 'rejected')}
                          className="px-4 bg-red-50 text-red-600 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-100 transition-all"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                  {allPayments.filter(p => p.status === 'pending').length === 0 && (
                    <div className="col-span-full py-12 text-center bg-zinc-50 rounded-[32px] border border-dashed border-zinc-200">
                      <p className="text-zinc-400 font-medium italic">No hay pagos pendientes de validación</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-border overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-border">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-sub">Usuario</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-sub">Teléfono</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-sub">Suscripción</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-sub text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {allUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold">{u.full_name?.[0] || 'U'}</span>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-bold">{u.full_name || 'Sin nombre'}</div>
                              <div className="text-[10px] text-text-sub">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">{u.phone_number || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            u.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {u.subscription_status === 'active' ? 'Activo' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => updateUserSubscription(u.id, u.subscription_status === 'active' ? 'pending' : 'active')}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 ${
                                u.subscription_status === 'active' ? 'bg-zinc-100 text-black hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'
                              }`}
                            >
                              {u.subscription_status === 'active' ? 'Suspender' : 'Activar'}
                            </button>
                            <button 
                              onClick={() => deleteUser(u.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar Usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
          {activeTab === 'reminders' && (
            <motion.div 
              key="reminders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto space-y-8 text-center"
            >
              <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Compromiso WhatsApp</h1>
                <p className="text-text-sub">Genera un resumen de tus pendientes y envíatelo para mantener el orden y la disciplina.</p>
              </div>
              
              <div className="bg-white p-6 rounded-[24px] border border-border text-left space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-sub">
                  <Clock className="w-4 h-4" />
                  <span>Vista Previa</span>
                </div>
                <div className="bg-accent-soft p-4 rounded-xl text-sm font-mono whitespace-pre-wrap text-black text-left">
                  🚀 *MAR - RESUMEN*{"\n\n"}
                  🎯 *ENFOQUE:* {focusTask?.title || '...'}{"\n\n"}
                  📝 *HOY:*{"\n"}
                  {tasks.filter(t => !t.is_completed && t.is_for_today).slice(0, 3).map(t => {
                    const time = t.scheduled_time ? ` [${t.scheduled_time}]` : '';
                    return `- ${t.title}${time}`;
                  }).join('\n')}
                  {tasks.filter(t => !t.is_completed && t.is_for_today).length > 3 ? '\n... y más' : ''}
                </div>
              </div>

              <button 
                onClick={generateWhatsAppReminder}
                className="w-full apple-button py-4 text-lg flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                Enviar a WhatsApp
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

const LATAM_COUNTRIES = [
  { code: '+51', name: 'Perú', flag: '🇵🇪' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: '+52', name: 'México', flag: '🇲🇽' },
  { code: '+591', name: 'Bolivia', flag: '🇧🇴' },
  { code: '+55', name: 'Brasil', flag: '🇧🇷' },
  { code: '+506', name: 'Costa Rica', flag: '🇨🇷' },
  { code: '+53', name: 'Cuba', flag: '🇨🇺' },
  { code: '+593', name: 'Ecuador', flag: '🇪🇨' },
  { code: '+503', name: 'El Salvador', flag: '🇸🇻' },
  { code: '+502', name: 'Guatemala', flag: '🇬🇹' },
  { code: '+504', name: 'Honduras', flag: '🇭🇳' },
  { code: '+505', name: 'Nicaragua', flag: '🇳🇮' },
  { code: '+507', name: 'Panamá', flag: '🇵🇦' },
  { code: '+595', name: 'Paraguay', flag: '🇵🇾' },
  { code: '+1', name: 'Puerto Rico', flag: '🇵🇷' },
  { code: '+1', name: 'Rep. Dominicana', flag: '🇩🇴' },
  { code: '+598', name: 'Uruguay', flag: '🇺🇾' },
  { code: '+58', name: 'Venezuela', flag: '🇻🇪' },
];

function Portal() {
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+51');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'landing' | 'register' | 'payment' | 'success'>('landing');
  const [formData, setFormData] = useState({ name: '', phone: '', occupation: 'Estudiante' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [method, setMethod] = useState<'yape' | 'bcp' | null>(null);
  const [paymentCode, setPaymentCode] = useState('');
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = () => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    
    const newClicks = logoClicks + 1;
    setLogoClicks(newClicks);
    
    if (newClicks >= 3) {
      setShowAdminLogin(true);
      setLogoClicks(0);
    } else {
      clickTimer.current = setTimeout(() => {
        setLogoClicks(0);
      }, 2000);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'Admin2024') {
      localStorage.setItem('mar_admin_auth', 'true');
      window.location.reload();
    } else {
      setError('Contraseña administrativa incorrecta');
      setAdminPassword('');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Guardar datos en Supabase (o estado temporal)
      localStorage.setItem('mar_temp_user', JSON.stringify(formData));
      setStep('payment');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'landing') {
    return (
      <div className="min-h-screen bg-white font-sans overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 px-6 flex flex-col items-center text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-zinc-50 to-transparent -z-10" />
          
          <motion.div 
            onClick={handleLogoClick}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white shadow-xl mb-10 cursor-pointer hover:bg-zinc-800 transition-colors"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6, type: "spring" }}
            >
              <Lightbulb className="w-8 h-8 fill-yellow-400 text-yellow-400" />
            </motion.div>
            {/* Highly visible "idea" spark effect */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 2.5, 0] }}
              transition={{ delay: 0.5, duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
              className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-300 rounded-full blur-xl shadow-[0_0_30px_rgba(253,224,71,1)]"
            />
          </motion.div>

          <motion.h1 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-8 text-zinc-900"
          >
            MAR
          </motion.h1>

          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl font-medium text-zinc-500 max-w-2xl mx-auto leading-relaxed mb-12"
          >
            Tu asistente personal inteligente. Captura ideas, gestiona tareas desde WhatsApp y organiza tu día a día con absoluta claridad.
          </motion.p>

          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 w-full max-w-sm"
          >
            <button 
              onClick={() => setStep('register')}
              className="bg-black text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-zinc-800 transition-all shadow-lg"
            >
              Comenzar Ahora
            </button>
            <button 
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white text-zinc-900 px-8 py-4 rounded-full font-semibold text-lg border border-zinc-200 hover:bg-zinc-50 transition-all"
            >
              ¿Cómo ayuda?
            </button>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-32 px-6 bg-zinc-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-black tracking-tighter mb-16 text-center">¿Cómo te ayuda MAR?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard 
                image="https://images.unsplash.com/photo-1517842683364-972175217983?auto=format&fit=crop&q=80&w=600&h=400"
                title="Captura tus ideas al instante"
                desc="No dejes que una buena idea se escape. Anótala en segundos, estés donde estés, sin complicaciones."
              />
              <FeatureCard 
                image="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600&h=400"
                title="Tu asistente en WhatsApp"
                desc="Gestiona tus tareas y recibe recordatorios sin instalar apps complicadas. Todo desde tu chat favorito."
              />
              <FeatureCard 
                image="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=600&h=400"
                title="Orden para tu día a día"
                desc="Ya seas estudiante, comerciante o empresario, MAR te ayuda a priorizar lo que realmente importa para alcanzar tus metas."
              />
            </div>
          </div>
        </section>

        {/* Call to Action Final */}
        <section className="py-32 px-6 text-center">
          <div className="max-w-4xl mx-auto bg-black text-white p-12 rounded-[48px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-[80px]" />
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 relative z-10">¿Listo para recuperar tu tiempo?</h2>
            <p className="text-zinc-400 text-lg mb-10 relative z-10">Únete a la comunidad de MAR y empieza a organizar tu éxito hoy mismo.</p>
            <button 
              onClick={() => setStep('register')}
              className="bg-white text-black px-10 py-5 rounded-[22px] font-black text-xl hover:bg-zinc-100 transition-all active:scale-95"
            >
              Inscribirse Ahora
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-zinc-100 text-center text-zinc-400 text-sm font-medium">
          <div className="flex justify-center gap-6 mb-4">
            <a href={`https://wa.me/${CONFIG.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">WhatsApp</a>
            <a href={CONFIG.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Instagram</a>
            <a href={CONFIG.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Facebook</a>
          </div>
          <p>© 2024 MAR App. Todos los derechos reservados.</p>
        </footer>
      </div>
    );
  }

  if (step === 'register') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans">
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleRegister}
          className="max-w-md w-full space-y-6 bg-zinc-50 p-8 rounded-[40px]"
        >
          <h2 className="text-3xl font-black tracking-tighter text-center">Tus datos</h2>
          <input 
            required
            placeholder="Nombre Completo"
            className="w-full bg-white border-none rounded-[22px] px-6 py-5 outline-none focus:ring-2 ring-black font-bold"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
          <div className="flex gap-2">
            <select 
              className="bg-white border-none rounded-[22px] px-4 py-5 outline-none focus:ring-2 ring-black font-bold"
              value={countryCode}
              onChange={e => setCountryCode(e.target.value)}
            >
              {LATAM_COUNTRIES.map(c => (
                <option key={c.code + c.name} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <input 
              required
              type="tel"
              placeholder="Teléfono"
              className="flex-1 bg-white border-none rounded-[22px] px-6 py-5 outline-none focus:ring-2 ring-black font-bold"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <select 
            className="w-full bg-white border-none rounded-[22px] px-6 py-5 outline-none focus:ring-2 ring-black font-bold"
            value={formData.occupation}
            onChange={e => setFormData({...formData, occupation: e.target.value})}
          >
            <option value="Estudiante">Estudiante</option>
            <option value="Emprendedor">Emprendedor</option>
            <option value="Empresario">Empresario</option>
            <option value="Otro">Otro</option>
          </select>
          {formData.occupation === 'Otro' && (
            <input 
              required
              placeholder="Especifique su ocupación"
              className="w-full bg-white border-none rounded-[22px] px-6 py-5 outline-none focus:ring-2 ring-black font-bold"
              value={formData.otherOccupation || ''}
              onChange={e => setFormData({...formData, otherOccupation: e.target.value})}
            />
          )}
          <button className="apple-button w-full py-5">Siguiente</button>
        </motion.form>
      </div>
    );
  }

  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-white p-6 font-sans flex flex-col items-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black tracking-tighter">Método de Pago</h2>
            <p className="text-zinc-500 font-medium">Selecciona cómo deseas pagar</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setMethod('yape')}
              className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-3 ${method === 'yape' ? 'border-purple-600 bg-purple-50' : 'border-zinc-100 bg-white'}`}
            >
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl">Y</div>
              <span className="font-bold">Yape</span>
            </button>
            <button 
              onClick={() => setMethod('bcp')}
              className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-3 ${method === 'bcp' ? 'border-blue-600 bg-blue-50' : 'border-zinc-100 bg-white'}`}
            >
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl">B</div>
              <span className="font-bold">BCP</span>
            </button>
          </div>

          {method && (
            <div className="bg-zinc-50 p-8 rounded-[40px] space-y-6">
              {method === 'yape' ? (
                <div className="text-center space-y-4">
                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">Escanea para Yape</p>
                  <div className="w-48 h-48 bg-white mx-auto rounded-2xl flex items-center justify-center border-4 border-purple-600 shadow-lg">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=YapeMAR" alt="QR Yape" className="w-32 h-32" />
                  </div>
                  <p className="text-lg font-black">999 888 777</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-400 text-center">Datos de Transferencia</p>
                  <div className="bg-white p-6 rounded-2xl space-y-2 border border-zinc-100">
                    <p className="text-xs text-zinc-400 font-bold uppercase">Banco</p>
                    <p className="font-bold">BCP - Banco de Crédito</p>
                    <p className="text-xs text-zinc-400 font-bold uppercase mt-4">Cuenta Corriente</p>
                    <p className="font-bold">191-99988877-0-12</p>
                  </div>
                </div>
              )}
              
              <input 
                placeholder="Código de Operación"
                className="w-full bg-white border-none rounded-[22px] px-6 py-5 outline-none focus:ring-2 ring-black font-bold"
                value={paymentCode}
                onChange={e => setPaymentCode(e.target.value)}
              />
              <button 
                onClick={() => setStep('success')}
                className="apple-button w-full py-5"
              >
                Enviar Pago
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6">
          <ChevronRight className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-black tracking-tighter mb-4">¡Registro Exitoso!</h2>
        <p className="text-zinc-500 mb-8">Tu pago está siendo validado. Pronto tendrás acceso.</p>
        <button 
          onClick={() => window.location.href = 'https://app.mar.com'}
          className="apple-button px-10 py-5"
        >
          Comenzar a usar MAR
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 overflow-hidden relative font-sans">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zinc-100 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-50 rounded-full blur-[120px] -z-10" />

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="max-w-md w-full space-y-10 text-center relative"
      >
        <div className="flex flex-col items-center justify-center">
          {/* Animated Bulb rising and glowing */}
          <motion.div 
            onClick={handleLogoClick}
            className="w-24 h-24 rounded-[32px] flex items-center justify-center text-white z-10 cursor-pointer shadow-2xl"
            initial={{ y: 100, opacity: 0, scale: 0.5 }}
            animate={{ 
              y: 0, 
              opacity: 1, 
              scale: 1,
              backgroundColor: ["#000000", "#000000", "#eab308"],
              boxShadow: [
                "0 20px 50px rgba(0,0,0,0.1)",
                "0 20px 50px rgba(0,0,0,0.1)",
                "0 0 80px rgba(234,179,8,0.5)"
              ]
            }}
            transition={{ 
              duration: 2, 
              ease: [0.22, 1, 0.36, 1],
              delay: 0.2,
              times: [0, 0.6, 1]
            }}
          >
            <motion.div
              animate={{ 
                color: ["#ffffff", "#ffffff", "#000000"],
                scale: [1, 1, 1.2, 1]
              }}
              transition={{ duration: 2, delay: 0.2, times: [0, 0.6, 0.8, 1] }}
            >
              <Lightbulb className="w-12 h-12 fill-current" />
            </motion.div>
          </motion.div>

          {/* Animated Text MAR joining */}
          <div className="mt-8 overflow-hidden flex justify-center">
            <motion.h1 
              initial={{ letterSpacing: "1.5em", opacity: 0, filter: "blur(10px)" }}
              animate={{ letterSpacing: "-0.05em", opacity: 1, filter: "blur(0px)" }}
              transition={{ 
                duration: 1.5, 
                ease: [0.22, 1, 0.36, 1],
                delay: 0.8
              }}
              className="text-8xl font-black tracking-tighter"
            >
              MAR
            </motion.h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 0.8 }}
            className="mt-4 space-y-3"
          >
            <p className="text-2xl font-bold tracking-tight text-black">
              Tu mar de ideas aquí
            </p>
            <div className="flex justify-center gap-2 mt-2">
              <span className="bg-yellow-400 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                Acceso Premium
              </span>
            </div>
            <p className="text-zinc-500 text-lg font-medium leading-tight max-w-[280px] mx-auto">
              Libera tu mente. Siente el alivio del orden.
            </p>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 0.8 }}
          className="bg-white/70 backdrop-blur-xl p-8 rounded-[48px] border border-zinc-100 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)]"
        >
          {showAdminLogin ? (
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Acceso Administrativo</label>
                <input 
                  type="password" 
                  required
                  autoFocus
                  placeholder="Contraseña Admin"
                  className="w-full bg-zinc-50 border-none rounded-[22px] px-6 py-5 outline-none focus:ring-2 ring-black transition-all font-bold text-lg"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-4 rounded-2xl">{error}</p>}
              <button 
                className="apple-button w-full"
              >
                Entrar como Admin
              </button>
              <button 
                type="button"
                onClick={() => setShowAdminLogin(false)}
                className="w-full text-xs font-bold text-zinc-400 hover:text-black transition-colors uppercase tracking-widest"
              >
                Volver al acceso móvil
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <p className="font-bold text-lg">¿Ya tienes cuenta?</p>
              <button 
                onClick={() => setStep('register')}
                className="apple-button w-full"
              >
                Iniciar Sesión
              </button>
            </div>
          )}
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6 }}
          className="text-xs text-zinc-400 font-medium italic"
        >
          "Libera tu mente. Siente el alivio del orden."
        </motion.p>
      </motion.div>
    </div>
  );
}

function FeatureCard({ image, title, desc }: { image: string, title: string, desc: string }) {
  return (
    <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden">
      <img src={image} alt={title} className="w-full h-48 object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517842683364-972175217983?auto=format&fit=crop&q=80&w=600&h=400'; }} referrerPolicy="no-referrer" />
      <div className="p-8">
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-zinc-500 font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function PaymentPortal({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [method, setMethod] = useState<'yape' | 'bcp' | null>(null);
  const [paymentCode, setPaymentCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const LATAM_COUNTRIES = [
    { code: '+51', name: 'Perú', flag: '🇵🇪' },
    { code: '+57', name: 'Colombia', flag: '🇨🇴' },
    { code: '+52', name: 'México', flag: '🇲🇽' },
    { code: '+54', name: 'Argentina', flag: '🇦🇷' },
    { code: '+56', name: 'Chile', flag: '🇨🇱' },
    { code: '+593', name: 'Ecuador', flag: '🇪🇨' },
    { code: '+503', name: 'El Salvador', flag: '🇸🇻' },
    { code: '+502', name: 'Guatemala', flag: '🇬🇹' },
    { code: '+504', name: 'Honduras', flag: '🇭🇳' },
    { code: '+505', name: 'Nicaragua', flag: '🇳🇮' },
    { code: '+507', name: 'Panamá', flag: '🇵🇦' },
    { code: '+595', name: 'Paraguay', flag: '🇵🇾' },
    { code: '+1', name: 'Puerto Rico', flag: '🇵🇷' },
    { code: '+1', name: 'Rep. Dominicana', flag: '🇩🇴' },
    { code: '+598', name: 'Uruguay', flag: '🇺🇾' },
    { code: '+58', name: 'Venezuela', flag: '🇻🇪' },
  ];

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Guardar el intento de pago en Supabase
      const { error } = await supabase
        .from('payments')
        .insert([{
          user_id: user.id,
          phone: user.phone,
          method,
          payment_code: paymentCode,
          status: 'pending'
        }]);

      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      alert('Error al enviar el pago. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center font-sans">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md space-y-6">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter">¡Pago Enviado!</h2>
          <p className="text-zinc-500 font-medium">Estamos validando tu pago. En breve recibirás un WhatsApp confirmando tu acceso total a MAR.</p>
          <button onClick={onLogout} className="apple-button w-full py-4">Entendido</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-black tracking-tighter">Activa tu cuenta MAR</h2>
          <p className="text-zinc-500 font-medium">Elige tu método de pago preferido para comenzar.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setMethod('yape')}
            className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-3 ${method === 'yape' ? 'border-purple-600 bg-purple-50' : 'border-white bg-white'}`}
          >
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl">Y</div>
            <span className="font-bold">Yape</span>
          </button>
          <button 
            onClick={() => setMethod('bcp')}
            className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-3 ${method === 'bcp' ? 'border-blue-600 bg-blue-50' : 'border-white bg-white'}`}
          >
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl">B</div>
            <span className="font-bold">BCP</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {method && (
            <motion.div 
              key={method}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-8 rounded-[40px] shadow-xl border border-zinc-100 space-y-6"
            >
              {method === 'yape' ? (
                <div className="text-center space-y-4">
                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">Escanea el QR para pagar</p>
                  <div className="w-48 h-48 bg-zinc-100 rounded-3xl mx-auto flex items-center justify-center border-4 border-purple-600">
                    {/* Aquí iría tu QR real */}
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=YapeMAR" alt="QR Yape" className="w-32 h-32" />
                  </div>
                  <p className="text-lg font-black">999 888 777</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-400 text-center">Datos de Transferencia</p>
                  <div className="bg-zinc-50 p-6 rounded-2xl space-y-2">
                    <p className="text-xs text-zinc-400 font-bold uppercase">Banco</p>
                    <p className="font-bold">BCP - Banco de Crédito</p>
                    <p className="text-xs text-zinc-400 font-bold uppercase mt-4">Cuenta Corriente</p>
                    <p className="font-bold">191-99988877-0-12</p>
                    <p className="text-xs text-zinc-400 font-bold uppercase mt-4">CCI</p>
                    <p className="font-bold">002-191-99988877012-55</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitPayment} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Código de Operación / Referencia</label>
                  <input 
                    required
                    placeholder="Ej: 12345678"
                    className="w-full bg-zinc-50 border-none rounded-[22px] px-6 py-4 outline-none focus:ring-2 ring-black font-bold"
                    value={paymentCode}
                    onChange={(e) => setPaymentCode(e.target.value)}
                  />
                </div>
                <button disabled={loading} className="apple-button w-full py-5">
                  {loading ? 'Enviando...' : 'Confirmar Pago'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={onLogout} className="w-full text-zinc-400 font-bold text-xs uppercase tracking-widest hover:text-black transition-colors">
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

function StatItem({ label, val }: { label: string, val: string }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-border">
      <div className="text-[10px] text-text-sub font-bold uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-bold my-1 tracking-tight">{val}</div>
    </div>
  );
}

function GuideStep({ num, text }: { num: string, text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
      <span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">{num}</span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

function OnboardingStep({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center text-xs font-bold shrink-0">{number}</div>
      <div>
        <h4 className="font-bold text-sm">{title}</h4>
        <p className="text-xs text-text-sub">{desc}</p>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, className = "" }: { active: boolean, onClick: () => void, icon: ReactNode, label: string, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all relative ${active ? 'text-black' : 'text-text-sub hover:text-black'} ${className}`}
    >
      {active && (
        <motion.div 
          layoutId="nav-glow"
          className="absolute inset-0 bg-accent-soft rounded-2xl -z-10"
        />
      )}
      <div className="w-6 h-6">{icon}</div>
      <span className="text-[10px] font-bold uppercase tracking-tighter md:hidden">{label}</span>
    </button>
  );
}

function StatCard({ icon, label, value, color }: { icon: ReactNode, label: string, value: string, color: string }) {
  return (
    <div className={`${color} p-6 rounded-3xl border border-transparent hover:border-zinc-200 transition-all`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 flex items-center justify-center">{icon}</div>
        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onSend?: () => void;
  showProject?: boolean;
  onAddSubtask?: (title: string) => void;
  onToggleSubtask?: (sid: string) => void;
  onStartTimer?: () => void;
  onStopTimer?: () => void;
  onStatusChange?: (status: 'todo' | 'in_progress' | 'done') => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  onToggle, 
  onSend, 
  showProject, 
  onAddSubtask, 
  onToggleSubtask,
  onStartTimer,
  onStopTimer
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');

  return (
    <div className="flex flex-col hover:bg-accent-soft transition-colors group">
      <div className="flex items-center gap-4 p-5">
        <div className="relative">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }} 
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border-2 relative z-10 ${
              task.is_completed 
                ? 'bg-black border-black text-white shadow-xl shadow-zinc-200' 
                : 'border-zinc-200 text-transparent hover:border-black bg-white shadow-sm'
            }`}
          >
            <motion.div
              initial={false}
              animate={{ 
                scale: task.is_completed ? 1 : 0,
                rotate: task.is_completed ? 0 : -45,
                opacity: task.is_completed ? 1 : 0
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <CheckCircle2 className="w-7 h-7" />
            </motion.div>
            {!task.is_completed && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-10 transition-opacity">
                <CheckCircle2 className="w-7 h-7 text-black" />
              </div>
            )}
          </motion.button>
          
          {/* Confetti Effect on completion */}
          <AnimatePresence>
            {task.is_completed && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                    animate={{ 
                      scale: [0, 1, 0],
                      x: Math.cos(i * 45 * (Math.PI / 180)) * 40,
                      y: Math.sin(i * 45 * (Math.PI / 180)) * 40,
                      opacity: 0
                    }}
                    transition={{ duration: 0.8, ease: "circOut" }}
                    className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-yellow-400"
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex-1 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <p className={`font-semibold transition-all ${task.is_completed ? 'text-text-sub line-through opacity-50' : 'text-text-main'}`}>
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            {showProject && task.project_id && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-sub">Proyecto Activo</span>
            )}
            {task.tags.map(tag => (
              <span key={tag} className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 px-2 py-0.5 rounded-full">
                <Tag className="w-3 h-3 inline mr-1" />
                {tag}
              </span>
            ))}
            {task.total_time_spent ? (
              <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">
                <Timer className="w-3 h-3" />
                <span>{Math.floor(task.total_time_spent / 60)}m</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!task.is_completed && (
            <button 
              onClick={task.timer_start ? onStopTimer : onStartTimer}
              className={`p-2 rounded-full transition-all ${task.timer_start ? 'bg-red-50 text-red-500 animate-pulse' : 'hover:bg-zinc-200 text-zinc-400'}`}
            >
              {task.timer_start ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            {onSend && !task.is_completed && (
              <button 
                onClick={onSend}
                className="p-2 text-zinc-400 hover:text-black transition-colors"
                title="Enviar a WhatsApp"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}
            <button className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-zinc-50/50 border-t border-zinc-100"
          >
            <div className="p-5 pl-16 space-y-4">
              {task.comments && (
                <div className="bg-white p-3 rounded-xl border border-zinc-200">
                  <p className="text-xs text-text-sub italic">"{task.comments}"</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-sub">Subtareas</p>
                <div className="space-y-2">
                  {task.subtasks.map(sub => (
                    <div key={sub.id} className="flex items-center gap-3">
                      <button 
                        onClick={() => onToggleSubtask?.(sub.id)}
                        className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${sub.is_completed ? 'bg-black border-black text-white' : 'border-zinc-300'}`}
                      >
                        {sub.is_completed && <CheckCircle2 className="w-3 h-3" />}
                      </button>
                      <span className={`text-sm ${sub.is_completed ? 'text-text-sub line-through' : 'text-text-main'}`}>
                        {sub.title}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="text" 
                      placeholder="Nueva subtarea..." 
                      className="flex-1 bg-transparent border-b border-zinc-200 text-sm py-1 outline-none focus:border-black"
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onAddSubtask?.(newSubtask);
                          setNewSubtask('');
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        onAddSubtask?.(newSubtask);
                        setNewSubtask('');
                      }}
                      className="p-1 hover:bg-zinc-200 rounded"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

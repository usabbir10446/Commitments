
import { Task, EmergencyMessage, WelcomeTask } from '../types';
import { supabase } from './supabase';

export const storageService = {
  getTasks: async (): Promise<Task[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('time_block', { ascending: true });
    
    if (error) return [];
    return (data || []).map(t => ({
      id: t.id,
      date: t.date,
      timeBlock: t.time_block,
      title: t.title,
      venue: t.venue,
      remarks: t.remarks,
      attended: t.attended
    }));
  },

  saveTask: async (task: Partial<Task>): Promise<Task | null> => {
    const payload = {
      date: task.date,
      time_block: task.timeBlock,
      title: task.title,
      venue: task.venue,
      remarks: task.remarks,
      attended: task.attended
    };

    let result;
    if (task.id) {
      result = await supabase.from('tasks').update(payload).eq('id', task.id).select().single();
    } else {
      result = await supabase.from('tasks').insert([payload]).select().single();
    }

    if (result.error) return null;
    const t = result.data;
    return {
      id: t.id,
      date: t.date,
      timeBlock: t.time_block,
      title: t.title,
      venue: t.venue,
      remarks: t.remarks,
      attended: t.attended
    };
  },

  deleteTask: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    return !error;
  },

  // Welcome Task Methods
  getWelcomeTasks: async (): Promise<WelcomeTask[]> => {
    const { data, error } = await supabase.from('welcome_tasks').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(d => ({
      id: d.id,
      topText: d.top_text,
      bottomText1: d.bottom_text_1,
      bottomText2: d.bottom_text_2,
      bottomText3: d.bottom_text_3,
      imageData: d.image_data,
      isActive: d.is_active
    }));
  },

  saveWelcomeTask: async (wt: Partial<WelcomeTask>): Promise<boolean> => {
    const payload = {
      top_text: wt.topText,
      bottom_text_1: wt.bottomText1,
      bottom_text_2: wt.bottomText2,
      bottom_text_3: wt.bottomText3,
      image_data: wt.imageData
    };
    const { error } = await supabase.from('welcome_tasks').insert([payload]);
    return !error;
  },

  setWelcomeActive: async (id: string, active: boolean): Promise<boolean> => {
    // First, deactivate all
    await supabase.from('welcome_tasks').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (active) {
      const { error } = await supabase.from('welcome_tasks').update({ is_active: true }).eq('id', id);
      return !error;
    }
    return true;
  },

  deleteWelcomeTask: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('welcome_tasks').delete().eq('id', id);
    return !error;
  },

  getEmergencies: async (): Promise<EmergencyMessage[]> => {
    const { data, error } = await supabase.from('emergencies').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(e => ({
      id: e.id,
      text: e.text,
      createdAt: new Date(e.created_at).getTime()
    }));
  },

  broadcastEmergency: async (text: string): Promise<EmergencyMessage | null> => {
    const { data, error } = await supabase.from('emergencies').insert([{ text }]).select().single();
    if (error) return null;
    return {
      id: data.id,
      text: data.text,
      createdAt: new Date(data.created_at).getTime()
    };
  }
};

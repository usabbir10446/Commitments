
import { Task, EmergencyMessage } from '../types';
import { supabase } from './supabase';

export const storageService = {
  getTasks: async (): Promise<Task[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('time_block', { ascending: true });
    
    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }

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
      result = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', task.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('tasks')
        .insert([payload])
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error saving task:', result.error);
      return null;
    }

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
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting task:', error);
      return false;
    }
    return true;
  },

  getEmergencies: async (): Promise<EmergencyMessage[]> => {
    const { data, error } = await supabase
      .from('emergencies')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching emergencies:', error);
      return [];
    }

    return (data || []).map(e => ({
      id: e.id,
      text: e.text,
      createdAt: new Date(e.created_at).getTime()
    }));
  },

  broadcastEmergency: async (text: string): Promise<EmergencyMessage | null> => {
    const { data, error } = await supabase
      .from('emergencies')
      .insert([{ text }])
      .select()
      .single();

    if (error) {
      console.error('Error broadcasting emergency:', error);
      return null;
    }

    return {
      id: data.id,
      text: data.text,
      createdAt: new Date(data.created_at).getTime()
    };
  }
};

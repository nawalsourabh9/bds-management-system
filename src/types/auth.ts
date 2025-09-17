
export type ApprovalRecord = {
  id: string;
  user_id: string;
  email: string;
  status: string;
  created_at: string;
};

export type EmployeeData = {
  id: string;
  email: string;
  name: string;
  employee_id: string;
  department: string;
  position: string;
  role: string;
  status: string;
  phone?: string | null;
  supervisor_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AuthContextType = {
  session: any | null;
  user: any | null | EmployeeData;
  signIn: (email: string, password: string) => Promise<{ employee: EmployeeData }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{
    user: any | null;
    session: any | null;
  } | {
    user: null;
    session: null;
  } | undefined>;
  signOut: () => Promise<void>;
  loading: boolean;
  error: string | null;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (data: { first_name?: string; last_name?: string; email?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  approveUser: (userId: string) => Promise<void>;
  rejectUser: (userId: string) => Promise<void>;
  checkUserApprovalStatus: () => Promise<{ approved: boolean; message: string }>;
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

export type AuthResponse = {
  success: true;
  user: AuthUser;
  csrfToken: string;
};

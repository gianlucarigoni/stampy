import { IdentityProvider } from "./enum";

// Utente autenticato messo in `req.user` da isAuthenticated.
// Niente ruoli: quelli dello staff si leggono da venue_members a ogni richiesta.
export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  isPlatformAdmin: boolean;
};

// Sessione corrente: l'id serve al logout per revocare esattamente questa.
export type AuthSessionInfo = {
  id: string;
  authProvider: IdentityProvider;
};

export type AuthContext = {
  user: AuthUser;
  session: AuthSessionInfo;
};

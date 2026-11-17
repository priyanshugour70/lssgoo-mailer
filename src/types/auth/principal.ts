export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  googleSub: string;
};

export type SessionTokenPayload = {
  sessionId: string;
  userId: string;
};

export type PublicUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  imageUrl: string | null;
};
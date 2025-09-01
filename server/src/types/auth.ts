export type User = {
  id: string;
  email: string;
  accountType?: string;
  abuseipdbApiKey?: string;
};

export type JWTPayload = {
  sub: string;
  exp: number;
  accountType?: string;
  email?: string;
};

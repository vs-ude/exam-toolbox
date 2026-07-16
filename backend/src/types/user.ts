export type User = {
  sub: string;
  name: string;
  email: string;
  /**
   * Not {@link Group} since we store this in the DB directly
   */
  groups: string[];
  active?: boolean;
  lastLoginAt?: Date;
};

export type Group = {
  name: string;
  rights: Rights;
};

export type Rights = 'admin' | 'full' | 'limited';

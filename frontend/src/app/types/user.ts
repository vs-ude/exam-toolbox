export class User {
  sub: string = '';
  email: string = '';
  name: string = '';
  groups: string[] = [];
  iat?: number;
  exp?: number;

  // Legacy fields mapped for backwards compatibility
  id: string = '';
  roles: string[] = [];

  constructor(init?: Partial<User>) {
    Object.assign(this, init);

    if (!this.sub) this.sub = 'placeholder';
    if (!this.email) this.email = 'placeholder@example.com';
    if (!this.name) this.name = 'placeholder user';
    if (!this.groups) this.groups = ['placeholder_group'];
    if (!this.id) this.id = this.sub;
    if (!this.roles) this.roles = [];
  }
}

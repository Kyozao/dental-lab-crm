import { api } from "../../lib/api";

export const usersApi = {
  getAll() {
    return api<User[]>("/users");
  },

  getById(id: string) {
    return api<User>(`/users/${id}`);
  },

  create(data: CreateUserDto) {
    return api<User>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: UpdateUserDto) {
    return api<User>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(id: string) {
    return api(`/users/${id}`, {
      method: "DELETE",
    });
  },
};
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { User } from "../../utils/types/users.type";

export class UserService {
  async getUserById(userId: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || user.anonymizedAt !== null) return null;

    return user;
  }
}

export default new UserService();

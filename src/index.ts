import { DB } from "./core/db.js";
import { MySqlDriver } from "./driver/mySql.driver.js";
import { PostgreSqlDriver } from "./driver/prostgress.driver.js";
import { User } from "./entities/user.entity.js";

DB.setDriver(
  new PostgreSqlDriver({
    host: "localhost",
    user: "test",
    password: "test123",
    database: "users",
    port: 5432,
  }),
); // or new PostgreSqlDriver()
// DB.setDriver(new PostgreSqlDriver());

async function bootstrap(): Promise<void> {
  try {
    await DB.driver.connect();
    console.log("Connected to database");

    const newUser = new User({
      name: "John Doe",
      address: "123 Main St",
      dob: new Date("1990-01-01"),
      email: "john.doe@example.com",
      createdAt: new Date(),
      createdBy: 1,
      updatedAt: new Date(),
      updatedBy: 1,
    });
    console.log("New user saved:", newUser);
    await newUser.save();

    console.log("Finding user with name 'John Doe'...");
    let result = (await User.findOne({
      name: "John Doe",
    })) as any;
    console.log(result);

    console.log("Finding all users...");
    result = await User.findAll();
    console.log(result);

    console.log("Counting users...");
    const count = await User.count();
    console.log("Total users:", count);

    console.log("Updating user with id 1...");
    const updatedCount = await User.updateById(
      1,
      {
        address: "456 Elm St",
      },
    );
    console.log(`Updated ${updatedCount} user(s)`);

    console.log("Deleting user with id 1...");
    const deleted = await User.deleteById(33);
    console.log(`User with id 1 deleted: ${deleted}`);

    console.log("Deleting all users with name 'John Doe'...");
    const deletedCount = await User.deleteAll({
      name: "John Doe",
    });
    console.log(`Deleted ${deletedCount} user(s) with name 'John Doe'`);

  } catch (err) {
    console.error("Application startup failed:", err);
  } finally {
    try {
      await DB.driver.disconnect();
      console.log("Disconnected from database");
    } catch (err) {
      console.error("Error disconnecting from database:", err);
    }
  }
}

void bootstrap();

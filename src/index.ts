import { User } from "./entities/user.entity.js";

console.log("Testing ORM...");

console.log("Creating user...");
const newUser = new User({
  id: 1,
  name: "John Doe",
  address: "123 Main St",
  dob: new Date("1990-01-01"),
  email: "john.doe@example.com",
  createdAt: new Date(),
  createdBy: 1,
  updatedAt: new Date(),
  updatedBy: 1,
});

console.log("Saving user...");
console.log(await newUser.save());

console.log("Updating user...");
console.log(
  await newUser.save({
    where: {
      email: "john.doe@example.com",
      dob: new Date("1990-01-01"),
    },
    data: {
      name: "John Doe",
      address: "123 Main St",
    },
  }),
);

console.log("Finding user by ID...");
const foundUser = await User.findById(1);
console.log("Found user:", foundUser);

console.log("Finding all users...");
const allUsers = await User.findAll();
console.log("All users:", allUsers);

console.log("Finding one user by condition...");
const oneUser = await User.findOne({ email: "john.doe@example.com" });
console.log("Found user:", oneUser);

console.log("Deleting user by ID...");
console.log(await User.deleteById(1));

console.log("Deleting one user by condition...");
newUser.save();
console.log(await User.deleteOne({ email: "john.doe@example.com" }));

console.log("Deleting all users...");
newUser.save();
console.log(await User.deleteAll());

User.closeConnection();

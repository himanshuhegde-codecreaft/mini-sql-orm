
import { DB } from "./core/db.js";
import { MySqlDriver } from "./driver/mySql.driver.js";
import { PostgreSqlDriver } from "./driver/prostgress.driver.js";
import { User } from "./entities/user.entity.js";


DB.setDriver(new PostgreSqlDriver({
    host:'localhost',
    user: 'test',
    password:'test123',
    database:'users',
    port:5432
})); // or new PostgreSqlDriver()
// DB.setDriver(new PostgreSqlDriver());

async function bootstrap(): Promise<void> {
    try {
        await DB.driver.connect();
        console.log("Connected to database");

        const newUser = new User({
            name: 'John Doe',
            address: '123 Main St',
            dob: new Date('1990-01-01'),
            email: 'john.doe@example.com',
            createdAt: new Date(),
            createdBy: 1,
            updatedAt: new Date(),
            updatedBy: 1
        });
        await newUser.save();

        const foundUser = await User.updateAll({name:'John'}, {name: 'John Doe'});
        console.log(foundUser);

        // const newEmployee = new Employee({
        //     name: 'Jane Smith',
        //     position: 'Software Engineer',
        //     department: 'Engineering',
        //     salary: 90000,
        //     createdAt: new Date(),
        //     createdBy: 1,
        //     updatedAt: new Date(),
        //     updatedBy: 1
        // });
        // await newEmployee.save();

        // const foundEmployee = await Employee.findById(1);
        // console.log(foundEmployee);
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
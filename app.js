const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const { format, isValid } = require("date-fns");

const dbPath = path.join(__dirname, "todoApplication.db");

const app = express();
app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}1`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertDBObjectToResponseObject = (dbObj) => {
  return {
    id: dbObj.id,
    todo: dbObj.todo,
    priority: dbObj.priority,
    status: dbObj.status,
    category: dbObj.category,
    dueDate: dbObj.due_date,
  };
};

const verifyingParameterValues = (request, response, next) => {
  const { status, priority, category, dueDate = "2021-01-21" } = request.body;

  if (
    status !== "TO DO" &&
    status !== "IN PROGRESS" &&
    status !== "DONE" &&
    status !== undefined
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    priority !== "HIGH" &&
    priority !== "MEDIUM" &&
    priority !== "LOW" &&
    priority !== undefined
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    category !== "WORK" &&
    category !== "HOME" &&
    category !== "LEARNING" &&
    category !== undefined
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (
    isValid(new Date(dueDate)) === false ||
    dueDate === undefined
  ) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasPriorityAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndPriorityProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

//GET Todos API

app.get("/todos/", async (request, response) => {
  const { search_q = "", priority, status, category } = request.query;
  //console.log(priority, status, category);

  let getTodosQuery = "";
  let dbResponse = "";

  if (
    status !== "TO DO" &&
    status !== "IN PROGRESS" &&
    status !== "DONE" &&
    status !== undefined
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    priority !== "HIGH" &&
    priority !== "MEDIUM" &&
    priority !== "LOW" &&
    priority !== undefined
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    category !== "WORK" &&
    category !== "HOME" &&
    category !== "LEARNING" &&
    category !== undefined
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    switch (true) {
      case hasStatusProperty(request.query):
        getTodosQuery = `SELECT * FROM todo WHERE status = '${status}';`;
        break;

      case hasPriorityProperty(request.query):
        getTodosQuery = `SELECT * FROM todo WHERE priority = '${priority}';`;
        break;

      case hasCategoryProperty(request.query):
        getTodosQuery = `SELECT * FROM todo WHERE category = '${category}';`;
        break;

      case hasPriorityAndStatusProperty(request.query):
        getTodosQuery = `SELECT * FROM todo WHERE priority = '${priority}'
                                    AND status = '${status}';`;
        break;

      case hasCategoryAndStatusProperty(request.query):
        getTodosQuery = `SELECT * FROM todo WHERE category = '${category}' 
                                    AND status = '${status}';`;
        break;

      case hasCategoryAndPriorityProperty(request.query):
        getTodosQuery = `SELECT * FROM todo WHERE priority = '${priority}'
                                    AND category = '${category}';`;
        break;

      default:
        getTodosQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%';`;
        break;
    }

    dbResponse = await db.all(getTodosQuery);
    response.send(
      dbResponse.map((eachTodo) => convertDBObjectToResponseObject(eachTodo))
    );
  }
});

//GET Todo by ID API
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const getTodoByIDQuery = `SELECT * FROM todo WHERE id = ${todoId};`;

  const dbResponse = await db.get(getTodoByIDQuery);
  response.send(convertDBObjectToResponseObject(dbResponse));
});

//GET Todo by Date API
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const split = date.split("-");

  if (isValid(new Date(date)) === false || date === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
      const formatedDate = format(
      new Date(split[0], parseInt(split[1]) - 1, split[2]),
      "yyyy-MM-dd"
    );
    //console.log(date, formatedDate);
    
    const getTodoByDateQuery = `SELECT * FROM todo WHERE due_date = '${formatedDate}';`;

    const dbResponse = await db.all(getTodoByDateQuery);
    response.send(
      dbResponse.map((eachTodo) => convertDBObjectToResponseObject(eachTodo))
    );
  }
});

//POST Todo API
app.post("/todos/", verifyingParameterValues, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  const split = dueDate.split("-");
  const formatedDate = format(
    new Date(split[0], parseInt(split[1]) - 1, split[2]),
    "yyyy-MM-dd"
  );

  const createTodoQuery = `
        INSERT INTO
            todo ( id, todo, priority, status, category, due_date )
        VALUES 
         ( ${id}, '${todo}', '${priority}', '${status}', '${category}', '${formatedDate}' );`;

  await db.run(createTodoQuery);
  response.send("Todo Successfully Added");
});

const updateStatus = (requestBody) => {
  return requestBody.status !== undefined;
};

const updatePriority = (requestBody) => {
  return requestBody.priority !== undefined;
};

const updateCategory = (requestBody) => {
  return requestBody.category !== undefined;
};

const updateTodo = (requestBody) => {
  return requestBody.todo !== undefined;
};

const updateDate = (requestBody) => {
  return requestBody.dueDate !== undefined;
};

//PUT Todo API
app.put(
  "/todos/:todoId/",
  verifyingParameterValues,
  async (request, response) => {
    const { todoId } = request.params;
    const { todo, priority, status, category, dueDate } = request.body;
    //console.log(dueDate);

    let updateTodoQuery = "";
    let dbResponse = "";

    switch (true) {
      case updateStatus(request.body):
        updateTodoQuery = `UPDATE todo SET status = '${status}' WHERE id = ${todoId};`;
        dbResponse = "Status Updated";
        break;

      case updatePriority(request.body):
        updateTodoQuery = `UPDATE todo SET priority = '${priority}' WHERE id = ${todoId};`;
        dbResponse = "Priority Updated";
        break;

      case updateCategory(request.body):
        updateTodoQuery = `UPDATE todo SET category = '${category}' WHERE id = ${todoId};`;
        dbResponse = "Category Updated";
        break;

      case updateTodo(request.body):
        updateTodoQuery = `UPDATE todo SET todo = '${todo}' WHERE id = ${todoId};`;
        dbResponse = "Todo Updated";
        break;

      case updateDate(request.body):
        const split = dueDate.split("-");
        const formatedDate = format(
          new Date(split[0], parseInt(split[1]) - 1, split[2]),
          "yyyy-MM-dd"
        );
        updateTodoQuery = `UPDATE todo SET due_date = '${formatedDate}' WHERE id = ${todoId};`;
        dbResponse = "Due Date Updated";
        break;
    }

    await db.run(updateTodoQuery);
    response.send(dbResponse);
  }
);

//DELETE Todo by ID API
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoByIDQuery = `
    DELETE FROM 
        todo 
    WHERE 
        id = ${todoId};`;

  await db.run(deleteTodoByIDQuery);
  response.send("Todo Deleted");
});

module.exports = app;

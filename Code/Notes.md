📌 Note1: (.js)
package json:
  "type": "commonjs",

 commonjs =>  static file loading
  module => dynamic file loading, supports top-level await and other modern features.

The problem is that in a .ts file, it doesn’t look clean to write an import from a .js file.

So we use type of commonjs and remove the file extension entirely from the import statement.

Ex: main.ts:
import bootstrap from "./app.bootstrap";

// --------------------------------------------------

📌 Note 2: (return statement )
app.bootstrap.ts:

app.get('/', (req: Request, res: Response, next: NextFunction) => {
        res.status(200).json({ message: "Landing page" });

        we don't need to use return statement here because we are sending the response and not doing any further processing in this route handler.
        
        Once we call res.status().json(), the response is sent back to the client and the route handler is effectively done. 
        
        res => return 
    });

// --------------------------------------------------
📌 Note 3: (express & types )
app.bootstrap.ts:

import express, { type Express, type Request , type Response , type NextFunction} from 'express';

=> We can remove type word from the import statement because TypeScript can infer the types from the context.
But we just be careful while doing that because it can lead to confusion and make the code less readable.

=> We can handel it like that:
import express from 'express';
           + 
import type { Express, Request, Response, NextFunction } from 'express';

this way we are explicitly telling TypeScript that we are importing types from the express module and not the actual implementation.

===================================

After ALl => import express from 'express'; only 
And write types like that:

    const app:express.Express = express();

    app.get('/', (req: express.Request, res: express.Response, next: NextFunction)
    )



// --------------------------------------------------

📌 Note 4: (Design Pattern )

=> single tone pattern
one instance shared on the whole application (Ex: DB connection )

=> Dependency Injection Pattern 
when we change to edit on class

// --------------------------------------------------

📌 Note 5: (DTO )

DTO => Data To Object 
Define the shape of enter and outer object 

Dto is a warning to me as a backend developer

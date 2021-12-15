# Lognostic
<a href="https://app.circleci.com/pipelines/github/kaonashi-noface/lognostic?branch=main&filter=all">
    <img src="https://circleci.com/gh/kaonashi-noface/lognostic.svg?style=svg" alt="CircleCI Build" />
</a>
<a href='https://coveralls.io/github/kaonashi-noface/lognostic?branch=main'>
    <img src='https://coveralls.io/repos/github/kaonashi-noface/lognostic/badge.svg?branch=main' alt='Code Coverage' />
</a>

<a href='https://www.npmjs.com/package/lognostic'>
    <img alt="npm version" src="https://img.shields.io/npm/v/lognostic" />
</a>
<a href='https://www.npmjs.com/package/lognostic'>
    <img alt="license" src="https://img.shields.io/npm/l/lognostic" />
</a>
<a href='https://www.npmjs.com/package/lognostic'>
    <img alt="downloads" src="https://img.shields.io/npm/dm/lognostic" />
</a>

Lognostic is a logger facade that provides decorators and context management.

> WARNING: This module does not yet have any functionality.
> 
> Please do not install this module and expect it to work until you see v1.0.0.

# Proposal
When designing an anostic logger, we have to keep in mind that some loggers:
* support custom log levels
* do not have the same builtin log levels (e.g. `bunyan` has `fatal` but `winston` does not)

> Note: lognostic should work irrespective of log format (e.g. space separated vs json).

You should be able to pass in any logger like so:
```ts
// Assume logger is created according to logger facade:
const bunyan = new BunyanLogger();
const winston = new WinstonLogger();
const pino = new PinoLogger();

import { LogFactory, Log } from 'lognostic';

// Interface for setting/defining a logger change over time. This is just an example:
LogFactory.setLogger(winston);

class InvoiceService {
    // The idea is to have level override which log level to label the events as.
    @Log({ level: 'debug' })
    getUser(username: string) : Promise<User> {
        return wait this.dynamoDbClient.get(/*...parameters...*/).promise();
    }

    @Log({ level: 'debug' })
    generateInvoice(user: User, session: Session) : Invoice {
        return new Invoice(user, session);
    }

    @Log({ level: 'info' })
    submitInvoice(invoice: Invoice) : Promise<void> {
        return this.invoiceQueue.send(invoice);
    }
}
```

In this example, we invoke the class methods like so:
```ts
const service = new InvoiceService();
const user = await service.getUser('username123');
const invoice = await service.generateInvoice(user, session);
await service.submitInvoice(invoice);
```

Every function invocation with a decorator would pass events to the registered logger as a <LOG LEVEL> type:
```
{
    level: <LOG LEVEL>,
    logEvent: 'start',
    function: {
        name: 'getUser'
        args: [ 'username123' ]
    }
}
{
    level: 'error',
    logEvent: 'error',
    function: {
        name: 'getUser'
        args: [ 'username123' ]
    },
    error: {
        name: 'SomeError',
        message: 'some error message',
        stack: 'stack trace...'
    }
}
{
    level: <LOG LEVEL>,
    logEvent: 'end',
    function: {
        name: 'getUser'
        args: [ 'username123' ]
    }
}
```

In the future, the idea is to allow the creation and maintainence of contexts for each `@Log` decorator:
```ts
class InvoiceService {
    // The idea is to have level override which log level to label the events as.
    @Log({ level: 'debug', using: Contextual.get() })
    getUser(username: string) : Promise<User> {
        return wait this.dynamoDbClient.get(/*...parameters...*/).promise();
    }

    @Log({ level: 'debug', using: { ...Contextual.get(), /*...figure out how to create child context from a parent context...*/} })
    generateInvoice(user: User, session: Session) : Invoice {
        return new Invoice(user, session);
    }

    @Log({ level: 'info' })
    submitInvoice(invoice: Invoice) : Promise<void> {
        return this.invoiceQueue.send(invoice);
    }
}

import { initializeTraceContext } from 'b3trace';
const invoiceService = new InvoiceService();
function handler({headers}, ctx) {
    const traceId = headers['x-b3-traceid'];
    const spanId = headers['x-b3-spanid'];
    const trace = initializeTraceContext({ traceId, spanId });

    Contextual.using(traceId, { trace });
    try {
        const user = await service.getUser('username123');
        const invoice = await service.generateInvoice(user, session);
        await service.submitInvoice(invoice);
        return { statusCode: 200 };
    } catch(err) {
        return {
            // handle error states
        };
    } finally {
        Contextual.remove(traceId);
    }
}

export {
    handler
};
```

The exact details for preserving and resetting a context has not been fully defined.

The problem with the proposed design above is that there is no clear way to create & manage child Contexts:
```ts
/**
 * How do I construct a child trace from the parent?
 * Will other methods that want to create a child context point to the correct parent?
 * How will a context know if it's the child or the parent?
 * Can I guarantee the context tree integrity if the a method is called multiple times within a single context? Will this cause issues down the line?
 */
@Log({ level: 'debug', using: Contextual.get() })
getUser(username: string) : Promise<User> { /*...*/ }
```
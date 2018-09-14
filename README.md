# indiekicker (CS2102)

## About
This project uses Express as its server, Pug as its template engine and Postgres as its database.  
Database queries are made in `/routes`.

## Run
Ensure that the Postgres daemon is up and running.  
Then, simply do `npm run start`.

## Setup
#### Prequisites:  
Postgres 10.4 (current)  
pg_dump (should come with Postgres)  
psql (should come with Postgres)  
Node>=6.2  

#### To Install:
```bash
# Download the project
git clone https://github.com/dlqs/indiekicker.git
cd indiekicker

# Install the Node dependencies
npm install

# Obtain database credentials file default.json and store in in the config/ folder.
# (Not stored in version control for security)

# Setup postgres database and user
# A database cluster should have already been created at /var/lib/postgres/data on installation of Postgres.

# A superuser 'postgres' is automatically created on every installation of Postgres. 
# This is used to manage the installation.

# Change to user 'postgres'
sudo su - postgres
# Your prompt should now begin with postgres@...

# Start the postgres daemon in background
postgres -k /tmp -D /var/lib/postgres/data >logfile 2>&1 &

# Create a database with name indiekicker
createdb -h localhost indiekicker

# Create a user with name indie
# This is the account used by our application to access the database
createuser -h localhost indie

# Enter the postgres client (psql) as user 'postgres'
psql -h localhost
# Your prompt should now begin with postgres=#...

# Give indie password, grant privileges
ALTER USER indie WITH ENCRYPTED PASSWORD '<password>';
GRANT ALL PRIVILEGES ON DATABASE indiekicker To indie;

# We're done. Exit psql and postgres user.
# Ctrl-D to exit psql
# Ctrl-D once more to exit user 'postgres'
# Your prompt should now begin with <yourusername>@...

# To test our new user indie, enter the postgres client (psql) as user 'indie'
psql -h localhost -U indie indiekicker
# Your prompt should now begin with indiekicker=>...
# If so, success~

# Refer to below to restore database from the dump file (because yours is currently empty)

```

## Database

The database is not kept under version control, instead, its dump files are.
A dump file is a sequence of SQL commands that recreate the database in the
exact same state as it was at the time of the dump.
 
```bash
# From bash
# To write the current state of your database to a text dump file
pg_dump -h localhost -U indie --clean indiekicker > indiekicker.dump

# To restore a dump file to your database 
# Caution: *overwrites* the current state of your database with the dump!
psql -h localhost -U indie -d indiekicker -f indiekicker.dump
```
# delete_file

Delete a file at the given path. Use when the user wants to remove a file. Destructive and permanent — there is no undo. On a connection that guards deletions, calling this without `confirm` deletes nothing and returns a code to show the user; call again with that code once they agree.

## Parameters

### path — string (required)

Path to the file to delete.

### confirm — string

The confirmation code returned by a previous call for THIS path. Omit on the first call. Never invent one — a made-up code is rejected.


-- Create virtual_books table
CREATE TABLE IF NOT EXISTS virtual_books (
    id VARCHAR(36) NOT NULL,
    omnibus_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    sort_title VARCHAR(255) NOT NULL,
    number FLOAT,
    number_sort FLOAT,
    file_last_modified TIMESTAMP NOT NULL,
    file_size BIGINT NOT NULL,
    size BIGINT NOT NULL,
    url TEXT NOT NULL,
    created_date TIMESTAMP NOT NULL,
    last_modified_date TIMESTAMP NOT NULL,
    metadata TEXT,
    PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_virtual_books_omnibus_id ON virtual_books(omnibus_id);
CREATE INDEX IF NOT EXISTS idx_virtual_books_created_date ON virtual_books(created_date);
CREATE INDEX IF NOT EXISTS idx_virtual_books_sort_title ON virtual_books(sort_title);

-- Add foreign key constraint
ALTER TABLE virtual_books 
    ADD CONSTRAINT fk_virtual_books_omnibus 
    FOREIGN KEY (omnibus_id) 
    REFERENCES book(id) 
    ON DELETE CASCADE;

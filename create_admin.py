#!/usr/bin/env python3
"""
Admin Account Creation Script

This script creates an admin user for the OCEAN Personality Detection System.
It can be run from the command line with arguments or interactively.

Usage:
    python create_admin.py --name "Admin Name" --email "admin@example.com" --password "securepassword"
    python create_admin.py  # Interactive mode
"""

import argparse
import getpass
import sys
import re
from typing import Optional


def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return re.match(pattern, email) is not None


def validate_password(password: str) -> tuple[bool, str]:
    """Validate password strength."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    return True, ""


def get_input_interactive() -> tuple[str, str, str]:
    """Get user input interactively."""
    print("\n=== OCEAN Admin Account Creation ===\n")

    name = input("Enter admin name: ").strip()
    while not name:
        print("Name cannot be empty.")
        name = input("Enter admin name: ").strip()

    email = input("Enter admin email: ").strip()
    while not validate_email(email):
        print("Invalid email format. Please try again.")
        email = input("Enter admin email: ").strip()

    password = getpass.getpass("Enter admin password (min 8 chars): ")
    valid, msg = validate_password(password)
    while not valid:
        print(msg)
        password = getpass.getpass("Enter admin password (min 8 chars): ")
        valid, msg = validate_password(password)

    confirm_password = getpass.getpass("Confirm password: ")
    while password != confirm_password:
        print("Passwords do not match. Please try again.")
        confirm_password = getpass.getpass("Confirm password: ")

    return name, email, password


def create_admin(
    name: str, email: str, password: str, force: bool = False
) -> tuple[bool, str]:
    """
    Create an admin user in the database.

    Args:
        name: Admin's full name
        email: Admin's email address
        password: Admin's password (will be hashed)
        force: If True, update existing user to admin role

    Returns:
        Tuple of (success, message)
    """
    # Import Flask app and models inside function to avoid circular imports
    from flask_bcrypt import Bcrypt

    from app import create_app, db
    from app.models import User

    bcrypt = Bcrypt()

    app = create_app()

    with app.app_context():
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()

        if existing_user:
            if force:
                # Update existing user to admin
                existing_user.role = "admin"
                existing_user.name = name
                existing_user.password = bcrypt.generate_password_hash(password).decode("utf-8")
                db.session.commit()
                return True, f"Updated existing user '{email}' to admin role"
            else:
                if existing_user.is_admin():
                    return False, f"User '{email}' is already an admin"
                else:
                    return (
                        False,
                        f"User '{email}' already exists. Use --force to update to admin role",
                    )

        # Create new admin user
        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")
        admin_user = User(
            name=name,
            email=email,
            password=hashed_password,
            role="admin",
        )

        try:
            db.session.add(admin_user)
            db.session.commit()
            return True, f"Admin user '{name}' ({email}) created successfully!"
        except Exception as e:
            db.session.rollback()
            return False, f"Failed to create admin: {str(e)}"


def list_admins() -> None:
    """List all admin users in the system."""
    from app import create_app
    from app.models import User

    app = create_app()

    with app.app_context():
        admins = User.query.filter_by(role="admin").all()

        if not admins:
            print("\nNo admin users found in the system.")
            return

        print(f"\n=== Admin Users ({len(admins)}) ===\n")
        print(f"{'ID':<6} {'Name':<25} {'Email':<35} {'Created At'}")
        print("-" * 90)

        for admin in admins:
            created = admin.created_at.strftime("%Y-%m-%d %H:%M") if admin.created_at else "N/A"
            print(f"{admin.id:<6} {admin.name:<25} {admin.email:<35} {created}")


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Create an admin account for OCEAN Personality Detection System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python create_admin.py --name "John Admin" --email admin@example.com --password secret123
  python create_admin.py --interactive
  python create_admin.py --list
  python create_admin.py --email existing@example.com --force
        """,
    )

    parser.add_argument("--name", "-n", type=str, help="Admin's full name")
    parser.add_argument("--email", "-e", type=str, help="Admin's email address")
    parser.add_argument("--password", "-p", type=str, help="Admin's password")
    parser.add_argument(
        "--force",
        "-f",
        action="store_true",
        help="Force update if user already exists",
    )
    parser.add_argument(
        "--interactive",
        "-i",
        action="store_true",
        help="Run in interactive mode",
    )
    parser.add_argument(
        "--list",
        "-l",
        action="store_true",
        help="List all admin users",
    )

    args = parser.parse_args()

    # List admins
    if args.list:
        list_admins()
        return 0

    # Interactive mode
    if args.interactive or (not args.name and not args.email and not args.password):
        try:
            name, email, password = get_input_interactive()
        except KeyboardInterrupt:
            print("\n\nOperation cancelled.")
            return 1
    else:
        # Validate CLI arguments
        if not args.name:
            print("Error: --name is required")
            return 1
        if not args.email:
            print("Error: --email is required")
            return 1
        if not args.password:
            print("Error: --password is required")
            return 1

        if not validate_email(args.email):
            print("Error: Invalid email format")
            return 1

        valid, msg = validate_password(args.password)
        if not valid:
            print(f"Error: {msg}")
            return 1

        name = args.name
        email = args.email
        password = args.password

    # Create admin
    print("\nCreating admin account...")
    success, message = create_admin(name, email, password, force=args.force)

    if success:
        print(f"\n✅ {message}")
        return 0
    else:
        print(f"\n❌ {message}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

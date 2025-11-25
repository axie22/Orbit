"use client";

import {  Navbar,   
    NavbarBrand,   
    NavbarContent,   
    NavbarItem,
    Button} from "@heroui/react";

import Link from 'next/link'

export default function CustomNavbar() {
    return (
        <Navbar position="static">
            <NavbarBrand>
                <h1 className="font-bold">IntervAI</h1>
            </NavbarBrand>
            <NavbarContent className="hidden sm:flex gap-4" justify="center">
                <NavbarItem>
                    <Link color="foreground" href="#">
                        Practice
                    </Link>
                </NavbarItem>
                </NavbarContent>
                <NavbarContent justify="end">
                <NavbarItem className="hidden lg:flex">
                    <Link href="#">Login</Link>
                </NavbarItem>
                <NavbarItem>
                    <Button as={Link} color="primary" href="#" variant="flat">
                    Sign Up
                    </Button>
                </NavbarItem>
            </NavbarContent>
        </Navbar>
    );
}
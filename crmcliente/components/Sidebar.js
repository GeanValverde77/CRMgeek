import React from 'react';
import Link from 'next/link'
import { useRouter } from 'next/router';

const Sidebar = () => {

    // routing de next
    const router = useRouter();

    // console.log(router.pathname)

    return ( 
        <aside className="bg-gray-800 sm:w-1/3 xl:w-1/5 sm:min-h-screen p-5" >
            <div>
                <p className="text-white text-2xl font-black">CRM Clientes</p>
            </div>

            <nav className="mt-5 list-none">
                <li className={router.pathname === "/" ? "bg-blue-800 p-2" : "p-2"}>
                    <Link href="/">
                        <a className="text-white block">
                            Clientes
                        </a>
                    </Link>
                </li>
                <li className={router.pathname === "/pedidos" ? "bg-blue-800 p-2" : "p-2"}>
                    <Link href="/pedidos">
                        <a className="text-white block">
                            Pedidos
                        </a>
                    </Link>
                </li>
                <li className={router.pathname === "/productos" ? "bg-blue-800 p-2" : "p-2"}>
                    <Link href="/productos">
                        <a className="text-white block">
                            Productos
                        </a>
                    </Link>
                </li>
            </nav>

            <div className="sm:mt-10">
                <p className="text-white text-2xl font-black">Otras Opciones</p>
            </div>
            <nav className="mt-5 list-none">
                <li className={router.pathname === "/mejoresvendedores" ? "bg-blue-800 p-2" : "p-2"}>
                    <Link href="/mejoresvendedores">
                        <a className="text-white block">
                            Mejores Vendedores
                        </a>
                    </Link>
                </li>
                <li className={router.pathname === "/mejoresclientes" ? "bg-blue-800 p-2" : "p-2"}>
                    <Link href="/mejoresclientes">
                        <a className="text-white block">
                            Mejores Clientes
                        </a>
                    </Link>
                </li>
                <li className={router.pathname === "/pronostico" ? "bg-blue-800 p-2" : "p-2"}>
                    <Link href="/pronostico">
                        <a className="text-white block">
                            Pronostico ventas
                        </a>
                    </Link>
                </li>
                
                <li className={router.pathname === "/pronosticoPROGPT" ? "bg-blue-800 p-2" : "p-2"}>
                    <Link href="/pronosticoPROGPT">
                        <a className="text-white block">
                            pronosticoPROGPT
                        </a>
                    </Link>
                </li>
            </nav>

        </aside>
     );
}
 
export default Sidebar;
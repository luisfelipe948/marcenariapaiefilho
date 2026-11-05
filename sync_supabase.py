# -*- coding: utf-8 -*-
"""
Publica o portfólio e as imagens do site no Supabase, sem precisar de novo deploy.

Como funciona
  - O cms.py continua salvando tudo no computador (cms.db, site/assets/...).
  - Logo depois de cada alteração (e uma vez ao abrir o painel), este módulo
    envia, em segundo plano:
        * as imagens (portfólio e as 3 imagens fixas) para o bucket "site-images";
        * a lista de projetos e os endereços das imagens para a tabela "site_content".
  - O site lê a tabela "site_content" ao abrir (site/assets/js/conteudo.js) e
    se atualiza sozinho.

Se não houver internet, ou o arquivo .env não estiver preenchido, nada disso
atrapalha o painel: ele funciona como antes e só mostra o aviso na barra do topo.

Configuração (arquivo .env AO LADO do cms.py — nunca dentro de site/ nem no GitHub):
    SUPABASE_URL=https://xxxxxxxx.supabase.co
    SUPABASE_SECRET_KEY=sb_secret_...
Dependência:  pip install supabase
"""
import hashlib
import json
import mimetypes
import os
import threading
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
BUCKET = "site-images"
ATRASO_SEG = 1.5            # espera um instante para juntar várias alterações seguidas

# Estado mostrado no painel: desligado | enviando | ok | erro
status = {"estado": "desligado", "msg": "", "quando": 0.0}

_lock = threading.Lock()
_timer = None
_enviados = set()           # nomes de arquivo que já sabemos que estão no bucket
_cliente_cache = None


def _definir(estado, msg=""):
    status["estado"] = estado
    status["msg"] = msg
    status["quando"] = time.time()


def _ler_config():
    cfg = {}
    if ENV_PATH.exists():
        for linha in ENV_PATH.read_text(encoding="utf-8").splitlines():
            linha = linha.strip()
            if not linha or linha.startswith("#") or "=" not in linha:
                continue
            chave, valor = linha.split("=", 1)
            cfg[chave.strip()] = valor.strip().strip('"').strip("'")
    for chave in ("SUPABASE_URL", "SUPABASE_SECRET_KEY"):
        if os.environ.get(chave):
            cfg[chave] = os.environ[chave]
    return cfg


def configurado():
    cfg = _ler_config()
    url, chave = cfg.get("SUPABASE_URL", ""), cfg.get("SUPABASE_SECRET_KEY", "")
    return bool(url and chave) and "COLE_AQUI" not in url + chave


def _cliente():
    global _cliente_cache
    if _cliente_cache is None:
        try:
            from supabase import create_client
        except ImportError:
            raise RuntimeError("falta instalar o Supabase: pip install supabase")
        cfg = _ler_config()
        _cliente_cache = create_client(cfg["SUPABASE_URL"], cfg["SUPABASE_SECRET_KEY"])
    return _cliente_cache


def _subir(cliente, caminho, prefixo):
    """
    Envia o arquivo e devolve o endereço público. O nome vem do conteúdo (hash),
    então: a mesma imagem nunca é enviada duas vezes e uma imagem nova nunca
    aparece com a versão antiga guardada no cache do navegador.
    """
    dados = Path(caminho).read_bytes()
    nome = "%s/%s%s" % (prefixo, hashlib.sha256(dados).hexdigest()[:20], Path(caminho).suffix.lower())
    bucket = cliente.storage.from_(BUCKET)
    if nome not in _enviados:
        tipo = mimetypes.guess_type(str(caminho))[0] or "application/octet-stream"
        try:
            bucket.upload(nome, dados, {"content-type": tipo, "cache-control": "31536000", "upsert": "false"})
        except Exception as erro:
            texto = str(erro).lower()
            if "duplicate" not in texto and "already exists" not in texto and "409" not in texto:
                raise          # qualquer outro erro é de verdade
        _enviados.add(nome)
    return str(bucket.get_public_url(nome)).rstrip("?")


def publicar(coletor):
    """
    coletor() devolve (slots, projetos):
        slots    = {"hero_desktop": Path, "hero_mobile": Path, "showcase": Path}
        projetos = [{"dados": {id, titulo, descricao, cat, catNome, destaque}, "arquivo": Path | None}, ...]
    """
    cliente = _cliente()
    slots, projetos = coletor()
    linhas = []

    for chave, caminho in slots.items():
        if caminho and Path(caminho).exists():
            linhas.append({"key": "img_" + chave, "value": _subir(cliente, caminho, "site/" + chave)})

    lista = []
    for p in projetos:
        item = dict(p["dados"])
        arquivo = p.get("arquivo")
        item["imagem"] = _subir(cliente, arquivo, "portfolio") if arquivo and Path(arquivo).exists() else None
        lista.append(item)
    linhas.append({"key": "portfolio", "value": json.dumps(lista, ensure_ascii=False)})

    agora = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    for linha in linhas:
        linha["updated_at"] = agora
    cliente.table("site_content").upsert(linhas, on_conflict="key").execute()


def _executar(coletor):
    with _lock:                   # um envio por vez
        _definir("enviando")
        try:
            publicar(coletor)
            _definir("ok")
        except Exception as erro:
            print("[supabase] não consegui publicar:", erro)
            _definir("erro", str(erro))


def agendar(coletor):
    """Pede uma publicação em segundo plano (junta pedidos muito próximos)."""
    global _timer
    if not configurado():
        _definir("desligado", "preencha o arquivo .env")
        return
    _definir("enviando")
    if _timer is not None:
        _timer.cancel()
    _timer = threading.Timer(ATRASO_SEG, _executar, args=(coletor,))
    _timer.daemon = True
    _timer.start()

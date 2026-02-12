# ELF文件格式详解

## 1. ELF文件格式概述

### 1.1 ELF文件基本概念

**ELF（Executable and Linkable Format）**是Unix/Linux系统下的可执行文件、目标文件、共享库和核心转储的标准文件格式。

**ELF文件类型**：
- **可重定位文件（Relocatable File）**：`.o`文件，包含代码和数据，可被链接器使用
- **可执行文件（Executable File）**：可直接执行的程序
- **共享目标文件（Shared Object File）**：`.so`文件，动态链接库
- **核心转储文件（Core Dump File）**：程序异常终止时生成的内存转储

### 1.2 ELF文件结构视图

#### 1.2.1 链接视图（Linking View）
```
ELF Header
Program Header Table (可选)
Section 1
Section 2
...
Section n
Section Header Table
```

#### 1.2.2 执行视图（Execution View）
```
ELF Header
Program Header Table
Segment 1
Segment 2
...
Segment n
Section Header Table (可选)
```

## 2. ELF文件头（ELF Header）

### 2.1 ELF头结构定义

```c
#define EI_NIDENT 16

typedef struct {
    unsigned char e_ident[EI_NIDENT];  // ELF标识
    Elf32_Half    e_type;              // 文件类型
    Elf32_Half    e_machine;           // 目标架构
    Elf32_Word    e_version;           // 版本信息
    Elf32_Addr    e_entry;             // 程序入口地址
    Elf32_Off     e_phoff;             // 程序头表偏移
    Elf32_Off     e_shoff;             // 节头表偏移
    Elf32_Word    e_flags;             // 处理器特定标志
    Elf32_Half    e_ehsize;            // ELF头大小
    Elf32_Half    e_phentsize;         // 程序头表项大小
    Elf32_Half    e_phnum;             // 程序头表项数量
    Elf32_Half    e_shentsize;         // 节头表项大小
    Elf32_Half    e_shnum;             // 节头表项数量
    Elf32_Half    e_shstrndx;          // 节名字符串表索引
} Elf32_Ehdr;
```

### 2.2 ELF标识（e_ident）详解

```c
// e_ident数组各字节含义
unsigned char e_ident[16] = {
    0x7F, 'E', 'L', 'F',     // ELF魔数
    ELFCLASS32,              // 文件类（32位/64位）
    ELFDATA2LSB,             // 数据编码（小端/大端）
    EV_CURRENT,              // 版本号
    ELFOSABI_SYSV,           // 操作系统ABI
    0,                       // ABI版本
    0, 0, 0, 0, 0, 0, 0, 0  // 填充字节
};

// 文件类（ELFCLASS）
#define ELFCLASSNONE 0    // 无效类
#define ELFCLASS32   1    // 32位对象
#define ELFCLASS64   2    // 64位对象

// 数据编码（ELFDATA）
#define ELFDATANONE 0     // 无效数据编码
#define ELFDATA2LSB 1     // 小端格式
#define ELFDATA2MSB 2     // 大端格式
```

### 2.3 文件类型（e_type）

```c
// 文件类型定义
#define ET_NONE   0       // 无文件类型
#define ET_REL    1       // 可重定位文件
#define ET_EXEC   2       // 可执行文件
#define ET_DYN    3       // 共享目标文件
#define ET_CORE   4       // 核心文件
#define ET_LOPROC 0xff00  // 处理器特定范围开始
#define ET_HIPROC 0xffff  // 处理器特定范围结束
```

### 2.4 实战：解析ELF头信息

```c
#include <stdio.h>
#include <elf.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>

void print_elf_header(const char* filename) {
    int fd = open(filename, O_RDONLY);
    if (fd == -1) {
        perror("open");
        return;
    }
    
    Elf32_Ehdr ehdr;
    if (read(fd, &ehdr, sizeof(ehdr)) != sizeof(ehdr)) {
        perror("read");
        close(fd);
        return;
    }
    
    // 检查ELF魔数
    if (memcmp(ehdr.e_ident, "\x7F" "ELF", 4) != 0) {
        printf("Not an ELF file\n");
        close(fd);
        return;
    }
    
    printf("=== ELF Header Information ===\n");
    printf("Magic: %02x %02x %02x %02x\n", 
           ehdr.e_ident[0], ehdr.e_ident[1], 
           ehdr.e_ident[2], ehdr.e_ident[3]);
    
    // 文件类
    printf("Class: ");
    switch (ehdr.e_ident[EI_CLASS]) {
        case ELFCLASSNONE: printf("Invalid\n"); break;
        case ELFCLASS32: printf("ELF32\n"); break;
        case ELFCLASS64: printf("ELF64\n"); break;
        default: printf("Unknown\n"); break;
    }
    
    // 数据编码
    printf("Data: ");
    switch (ehdr.e_ident[EI_DATA]) {
        case ELFDATANONE: printf("Invalid\n"); break;
        case ELFDATA2LSB: printf("2's complement, little endian\n"); break;
        case ELFDATA2MSB: printf("2's complement, big endian\n"); break;
        default: printf("Unknown\n"); break;
    }
    
    // 文件类型
    printf("Type: ");
    switch (ehdr.e_type) {
        case ET_NONE: printf("No file type\n"); break;
        case ET_REL: printf("Relocatable file\n"); break;
        case ET_EXEC: printf("Executable file\n"); break;
        case ET_DYN: printf("Shared object file\n"); break;
        case ET_CORE: printf("Core file\n"); break;
        default: printf("Unknown\n"); break;
    }
    
    // 目标架构
    printf("Machine: 0x%x\n", ehdr.e_machine);
    printf("Version: 0x%x\n", ehdr.e_version);
    printf("Entry point address: 0x%x\n", ehdr.e_entry);
    printf("Start of program headers: %d (bytes into file)\n", ehdr.e_phoff);
    printf("Start of section headers: %d (bytes into file)\n", ehdr.e_shoff);
    printf("Flags: 0x%x\n", ehdr.e_flags);
    printf("Size of this header: %d (bytes)\n", ehdr.e_ehsize);
    printf("Size of program headers: %d (bytes)\n", ehdr.e_phentsize);
    printf("Number of program headers: %d\n", ehdr.e_phnum);
    printf("Size of section headers: %d (bytes)\n", ehdr.e_shentsize);
    printf("Number of section headers: %d\n", ehdr.e_shnum);
    printf("Section header string table index: %d\n", ehdr.e_shstrndx);
    
    close(fd);
}

int main(int argc, char* argv[]) {
    if (argc != 2) {
        printf("Usage: %s <elf_file>\n", argv[0]);
        return 1;
    }
    
    print_elf_header(argv[1]);
    return 0;
}
```

## 3. 程序头表（Program Header Table）

### 3.1 程序头表项结构

```c
typedef struct {
    Elf32_Word p_type;    // 段类型
    Elf32_Off  p_offset;   // 段在文件中的偏移
    Elf32_Addr p_vaddr;    // 段在内存中的虚拟地址
    Elf32_Addr p_paddr;    // 段在内存中的物理地址（通常等于vaddr）
    Elf32_Word p_filesz;   // 段在文件中的大小
    Elf32_Word p_memsz;    // 段在内存中的大小
    Elf32_Word p_flags;    // 段标志
    Elf32_Word p_align;    // 段对齐
} Elf32_Phdr;
```

### 3.2 段类型（p_type）

```c
// 段类型定义
#define PT_NULL         0           // 未使用的段
#define PT_LOAD         1           // 可加载段
#define PT_DYNAMIC      2           // 动态链接信息
#define PT_INTERP       3           // 程序解释器路径
#define PT_NOTE         4           // 辅助信息
#define PT_SHLIB        5           // 保留
#define PT_PHDR         6           // 程序头表自身
#define PT_TLS          7           // 线程局部存储
#define PT_LOOS         0x60000000  // 操作系统特定范围开始
#define PT_HIOS         0x6fffffff  // 操作系统特定范围结束
#define PT_LOPROC       0x70000000  // 处理器特定范围开始
#define PT_HIPROC       0x7fffffff  // 处理器特定范围结束

// GNU扩展段类型
#define PT_GNU_STACK    0x6474e551  // 栈权限标志
#define PT_GNU_RELRO    0x6474e552  // 只读重定位
```

### 3.3 段标志（p_flags）

```c
// 段权限标志
#define PF_X            (1 << 0)    // 可执行
#define PF_W            (1 << 1)    // 可写
#define PF_R            (1 << 2)    // 可读
#define PF_MASKOS       0x0ff00000  // 操作系统特定标志掩码
#define PF_MASKPROC     0xf0000000  // 处理器特定标志掩码
```

### 3.4 实战：解析程序头表

```c
#include <stdio.h>
#include <elf.h>
#include <fcntl.h>
#include <unistd.h>

void print_program_headers(const char* filename) {
    int fd = open(filename, O_RDONLY);
    if (fd == -1) {
        perror("open");
        return;
    }
    
    Elf32_Ehdr ehdr;
    if (read(fd, &ehdr, sizeof(ehdr)) != sizeof(ehdr)) {
        perror("read");
        close(fd);
        return;
    }
    
    // 定位到程序头表
    lseek(fd, ehdr.e_phoff, SEEK_SET);
    
    printf("=== Program Headers ===\n");
    printf("There are %d program headers, starting at offset %d\n\n", 
           ehdr.e_phnum, ehdr.e_phoff);
    
    for (int i = 0; i < ehdr.e_phnum; i++) {
        Elf32_Phdr phdr;
        if (read(fd, &phdr, sizeof(phdr)) != sizeof(phdr)) {
            perror("read");
            break;
        }
        
        printf("Program Header %d:\n", i);
        printf("  Type: ");
        switch (phdr.p_type) {
            case PT_NULL: printf("NULL\n"); break;
            case PT_LOAD: printf("LOAD\n"); break;
            case PT_DYNAMIC: printf("DYNAMIC\n"); break;
            case PT_INTERP: printf("INTERP\n"); break;
            case PT_NOTE: printf("NOTE\n"); break;
            case PT_SHLIB: printf("SHLIB\n"); break;
            case PT_PHDR: printf("PHDR\n"); break;
            case PT_TLS: printf("TLS\n"); break;
            default: printf("0x%x\n", phdr.p_type); break;
        }
        
        printf("  Offset: 0x%x\n", phdr.p_offset);
        printf("  Virtual address: 0x%x\n", phdr.p_vaddr);
        printf("  Physical address: 0x%x\n", phdr.p_paddr);
        printf("  File size: %d bytes\n", phdr.p_filesz);
        printf("  Memory size: %d bytes\n", phdr.p_memsz);
        
        printf("  Flags: ");
        if (phdr.p_flags & PF_R) printf("R");
        if (phdr.p_flags & PF_W) printf("W");
        if (phdr.p_flags & PF_X) printf("X");
        printf("\n");
        
        printf("  Alignment: 0x%x\n", phdr.p_align);
        printf("\n");
    }
    
    close(fd);
}

// 查找特定类型的段
Elf32_Phdr* find_segment_by_type(const char* filename, Elf32_Word type) {
    int fd = open(filename, O_RDONLY);
    if (fd == -1) return NULL;
    
    Elf32_Ehdr ehdr;
    if (read(fd, &ehdr, sizeof(ehdr)) != sizeof(ehdr)) {
        close(fd);
        return NULL;
    }
    
    // 分配内存存储程序头表
    Elf32_Phdr* phdrs = malloc(ehdr.e_phnum * sizeof(Elf32_Phdr));
    if (!phdrs) {
        close(fd);
        return NULL;
    }
    
    lseek(fd, ehdr.e_phoff, SEEK_SET);
    if (read(fd, phdrs, ehdr.e_phnum * sizeof(Elf32_Phdr)) != 
        ehdr.e_phnum * sizeof(Elf32_Phdr)) {
        free(phdrs);
        close(fd);
        return NULL;
    }
    
    // 查找指定类型的段
    for (int i = 0; i < ehdr.e_phnum; i++) {
        if (phdrs[i].p_type == type) {
            Elf32_Phdr* result = malloc(sizeof(Elf32_Phdr));
            memcpy(result, &phdrs[i], sizeof(Elf32_Phdr));
            free(phdrs);
            close(fd);
            return result;
        }
    }
    
    free(phdrs);
    close(fd);
    return NULL;
}
```

## 4. 节头表（Section Header Table）

### 4.1 节头表项结构

```c
typedef struct {
    Elf32_Word sh_name;       // 节名称（在节名字符串表中的索引）
    Elf32_Word sh_type;        // 节类型
    Elf32_Word sh_flags;       // 节标志
    Elf32_Addr sh_addr;        // 节在内存中的地址
    Elf32_Off  sh_offset;      // 节在文件中的偏移
    Elf32_Word sh_size;        // 节大小
    Elf32_Word sh_link;        // 链接到其他节的索引
    Elf32_Word sh_info;        // 附加信息
    Elf32_Word sh_addralign;   // 节对齐
    Elf32_Word sh_entsize;     // 表项大小（如果节包含表）
} Elf32_Shdr;
```

### 4.2 节类型（sh_type）

```c
// 节类型定义
#define SHT_NULL          0          // 无效节
#define SHT_PROGBITS      1          // 程序定义的信息
#define SHT_SYMTAB        2          // 符号表
#define SHT_STRTAB        3          // 字符串表
#define SHT_RELA          4          // 重定位表（带加数）
#define SHT_HASH          5          // 符号哈希表
#define SHT_DYNAMIC       6          // 动态链接信息
#define SHT_NOTE          7          // 注释信息
#define SHT_NOBITS        8          // 不占文件空间的节（如.bss）
#define SHT_REL           9          // 重定位表（无加数）
#define SHT_SHLIB         10         // 保留
#define SHT_DYNSYM        11         // 动态链接符号表
#define SHT_INIT_ARRAY    14         // 初始化函数数组
#define SHT_FINI_ARRAY    15         // 终止函数数组
#define SHT_PREINIT_ARRAY 16         // 预初始化函数数组
#define SHT_GROUP         17         // 节组
#define SHT_SYMTAB_SHNDX  18         // 扩展节索引
#define SHT_LOOS          0x60000000 // 操作系统特定范围开始
#define SHT_HIOS          0x6fffffff // 操作系统特定范围结束
#define SHT_LOPROC        0x70000000 // 处理器特定范围开始
#define SHT_HIPROC        0x7fffffff // 处理器特定范围结束
```

### 4.3 节标志（sh_flags）

```c
// 节标志定义
#define SHF_WRITE            (1 << 0)    // 可写
#define SHF_ALLOC            (1 << 1)    // 在内存中分配
#define SHF_EXECINSTR        (1 << 2)    // 包含可执行指令
#define SHF_MERGE            (1 << 4)    // 可合并
#define SHF_STRINGS          (1 << 5)    // 包含以null结尾的字符串
#define SHF_INFO_LINK        (1 << 6)    // sh_info包含节索引
#define SHF_LINK_ORDER       (1 << 7)    // 特殊的链接顺序要求
#define SHF_OS_NONCONFORMING (1 << 8)    // 需要特定的OS支持
#define SHF_GROUP            (1 << 9)    // 节组成员
#define SHF_TLS              (1 << 10)   // 线程局部存储
#define SHF_MASKOS          0x0ff00000  // 操作系统特定标志掩码
#define SHF_MASKPROC        0xf0000000  // 处理器特定标志掩码
```

### 4.4 重要节区详解

#### 4.4.1 .text节（代码段）
```c
// 包含可执行代码
// 标志：SHF_ALLOC | SHF_EXECINSTR
// 类型：SHT_PROGBITS
```

#### 4.4.2 .data节（已初始化数据段）
```c
// 包含已初始化的全局变量和静态变量
// 标志：SHF_ALLOC | SHF_WRITE
// 类型：SHT_PROGBITS
```

#### 4.4.3 .bss节（未初始化数据段）
```c
// 包含未初始化的全局变量和静态变量
// 标志：SHF_ALLOC | SHF_WRITE
// 类型：SHT_NOBITS（不占文件空间）
```

#### 4.4.4 .rodata节（只读数据段）
```c
// 包含只读数据（如字符串常量）
// 标志：SHF_ALLOC
// 类型：SHT_PROGBITS
```

#### 4.4.5 .dynamic节（动态链接信息）
```c
// 包含动态链接器需要的信息
// 标志：SHF_ALLOC | SHF_WRITE
// 类型：SHT_DYNAMIC
```

#### 4.4.6 .got节（全局偏移表）
```c
// 全局偏移表，用于位置无关代码
// 标志：SHF_ALLOC | SHF_WRITE
// 类型：SHT_PROGBITS
```

#### 4.4.7 .plt节（过程链接表）
```c
// 过程链接表，用于延迟绑定
// 标志：SHF_ALLOC | SHF_EXECINSTR
// 类型：SHT_PROGBITS
```

### 4.5 实战：解析节头表

```c
#include <stdio.h>
#include <elf.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>

void print_section_headers(const char* filename) {
    int fd = open(filename, O_RDONLY);
    if (fd == -1) {
        perror("open");
        return;
    }
    
    Elf32_Ehdr ehdr;
    if (read(fd, &ehdr, sizeof(ehdr)) != sizeof(ehdr)) {
        perror("read");
        close(fd);
        return;
    }
    
    // 读取节名字符串表
    char* shstrtab = NULL;
    if (ehdr.e_shstrndx != SHN_UNDEF) {
        Elf32_Shdr shstrtab_hdr;
        lseek(fd, ehdr.e_shoff + ehdr.e_shstrndx * sizeof(Elf32_Shdr), SEEK_SET);
        read(fd, &shstrtab_hdr, sizeof(shstrtab_hdr));
        
        shstrtab = malloc(shstrtab_hdr.sh_size);
        lseek(fd, shstrtab_hdr.sh_offset, SEEK_SET);
        read(fd, shstrtab, shstrtab_hdr.sh_size);
    }
    
    printf("=== Section Headers ===\n");
    printf("There are %d section headers, starting at offset %d\n\n", 
           ehdr.e_shnum, ehdr.e_shoff);
    
    lseek(fd, ehdr.e_shoff, SEEK_SET);
    
    for (int i = 0; i < ehdr.e_shnum; i++) {
        Elf32_Shdr shdr;
        if (read(fd, &shdr, sizeof(shdr)) != sizeof(shdr)) {
            perror("read");
            break;
        }
        
        printf("Section Header %d:\n", i);
        
        // 节名称
        if (shstrtab && shdr.sh_name < ehdr